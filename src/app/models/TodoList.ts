import { Todo } from "./Todo";
import { ListType } from "./ListType";

export interface TodoList {
  name: string;
  type: ListType;
  todoes?: Todo[];
  ownerUsername?: string;
  password?: string;
}
