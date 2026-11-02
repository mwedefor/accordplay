export interface Todo {
  todoId: string;
  title: string;
  completed: boolean;
  createdAt: string;
  userId: string;
}

export interface Song {
  songId: string;
  name: string;
  artist: string;
  instrument: string;
  link: string;
  price: number;
  createdAt: string;
  isVisible?: boolean;
}

export interface PurchasedSong extends Song {
  purchaseId: string;
  purchaseDate: string;
}
