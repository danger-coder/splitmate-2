export interface Settlement {
  _id: string;
  amount: number;
  from: "A" | "B";
  to: "A" | "B";
  date: string;
  note?: string;
}
