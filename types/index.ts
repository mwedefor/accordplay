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
  priceUSD?: number;
  createdAt: string;
  isVisible?: boolean;
  type?: 'song' | 'folder';
  folderId?: string;
}

export interface PurchasedSong extends Song {
  purchaseId: string;
  purchaseDate: string;
}
