export interface Todo {
  id: string;
  done: boolean;
  name: string;
  date?: number;
  parent?: Todo;
  order: number;
  children: Todo[];
}
