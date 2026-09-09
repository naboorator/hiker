import { randomInt, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { database, withTransaction } from '../core/database.js';
const userCount = 100;
const generatedEmailPattern = 'generated.%@myhike.test';
const generatedPassword = 'GeneratedUser123!';
const firstNames = [
    'Ana', 'Boris', 'Cene', 'Dora', 'Eva', 'Filip', 'Gregor', 'Hana', 'Igor', 'Jana',
    'Klara', 'Luka', 'Maja', 'Niko', 'Olga', 'Peter', 'Rok', 'Sara', 'Tina', 'Urban',
];
const lastNames = [
    'Breznik', 'Cerar', 'Dolinar', 'Erjavec', 'Fink', 'Godec', 'Hribar', 'Ilič', 'Jerman', 'Kovač',
    'Kralj', 'Mlakar', 'Novak', 'Oman', 'Potočnik', 'Rozman', 'Šolar', 'Turk', 'Vidmar', 'Zupan',
];
const users = Array.from({ length: userCount }, (_, index) => ({
    id: randomUUID(),
    name: `${firstNames[index % firstNames.length]} ${lastNames[Math.floor(index / firstNames.length) % lastNames.length]} ${String(index + 1).padStart(3, '0')}`,
    email: `generated.${String(index + 1).padStart(3, '0')}@myhike.test`,
}));
function pairKey(firstId, secondId) {
    return [firstId, secondId].sort().join(':');
}
try {
    const passwordHash = await bcrypt.hash(generatedPassword, 12);
    const connectionCount = await withTransaction(async (connection) => {
        await connection.query('DELETE FROM users WHERE email LIKE ?', [generatedEmailPattern]);
        await connection.batch(`INSERT INTO users (id, name, email, password_hash, role)
       VALUES (?, ?, ?, ?, 'normal_user')`, users.map((user) => [user.id, user.name, user.email, passwordHash]));
        await connection.batch('INSERT INTO settings (user_id, app_name, owner_name) VALUES (?, ?, ?)', users.map((user) => [user.id, 'My hike log', user.name]));
        const pairs = new Set();
        for (let index = 0; index < users.length; index++) {
            const current = users[index];
            const next = users[(index + 1) % users.length];
            pairs.add(pairKey(current.id, next.id));
        }
        for (const user of users) {
            const additionalFriends = randomInt(1, 5);
            while ([...pairs].filter((pair) => pair.split(':').includes(user.id)).length <
                additionalFriends + 2) {
                const candidate = users[randomInt(0, users.length)];
                if (candidate.id !== user.id)
                    pairs.add(pairKey(user.id, candidate.id));
            }
        }
        await connection.batch(`INSERT INTO friend_connections
         (id, user_id_1, user_id_2, requester_id, status)
       VALUES (?, ?, ?, ?, 'accepted')`, [...pairs].map((pair) => {
            const [userId1, userId2] = pair.split(':');
            return [randomUUID(), userId1, userId2, randomInt(0, 2) ? userId1 : userId2];
        }));
        return pairs.size;
    });
    const [stats] = await database.query(`SELECT COUNT(*) AS generatedUsers, MIN(friend_count) AS minFriends,
            MAX(friend_count) AS maxFriends, ROUND(AVG(friend_count), 2) AS averageFriends
       FROM (
         SELECT u.id, COUNT(f.id) AS friend_count
           FROM users u
           LEFT JOIN friend_connections f
             ON f.status = 'accepted' AND (f.user_id_1 = u.id OR f.user_id_2 = u.id)
          WHERE u.email LIKE ?
          GROUP BY u.id
       ) generated_friend_counts`, [generatedEmailPattern]);
    console.log(JSON.stringify({ ...stats, connections: connectionCount }, null, 2));
}
finally {
    await database.end();
}
