import type { Activity } from "./activity.interface.js";

export interface AdminActivity extends Activity {
  author: {
    id: string;
    name: string;
  };
}
