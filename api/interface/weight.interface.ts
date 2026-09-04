export interface Weight {
  id: string;
  userId: string;
  weightKg: number;
  recordedOn: string;
  createdAt: string;
}

export interface WeightInput {
  weightKg: number;
  recordedOn: string;
}
