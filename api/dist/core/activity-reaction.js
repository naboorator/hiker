export function reactionTargetsActivity(reaction, activity, activities) {
    if (reaction.activityId !== activity.id)
        return false;
    if (reaction.activityOwnerId)
        return reaction.activityOwnerId === activity.userId;
    const possibleOwnerIds = new Set(activities
        .filter((candidate) => candidate.id === reaction.activityId &&
        candidate.userId &&
        candidate.userId !== reaction.userId)
        .map((candidate) => candidate.userId));
    return possibleOwnerIds.size === 1 && possibleOwnerIds.has(activity.userId);
}
export function activityLikeSummary(activity, data) {
    const reactions = data.activityReactions
        .filter((reaction) => reaction.type === 'like' && reactionTargetsActivity(reaction, activity, data.activities))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const users = new Map(data.users.map((user) => [user.id, user.name]));
    return {
        likes: reactions.length,
        likedBy: reactions
            .map((reaction) => users.get(reaction.userId))
            .filter((name) => Boolean(name))
            .slice(0, 3),
    };
}
