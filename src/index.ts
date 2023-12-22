import {
    $update,
    $query,
    Record,
    StableBTreeMap,
    Result,
    nat64,
    Vec,
    match,
    ic
  } from "azle";
  import { v4 as uuidv4 } from "uuid";
  
  type User = Record<{
    id: string;
    createdAt: nat64;
    sessionIds: Vec<string>;
    bukuDipinjam: Vec<string>;
    name: string;
  }>;
  
  type Book = Record<{
    id: string;
    createdAt: nat64;
    name: string;
    dipinjam: boolean;
  }>;
  
  type Errors = Record<{
    UserDoesNotExist: string;
    booksDoesNotExist: string;
  }>;
  
  const users = new StableBTreeMap<string, User>(0, 44, 1024);
  const books = new StableBTreeMap<string, Book>(1, 44, 1024);
  
  $update
  export function createUser(name: string): Result<User, string> {
    // Parameter Validation
    if (!name) {
      return Result.Err<User, string>("Invalid Parameter.");
    }
  
    const id = uuidv4();
    const user: User = {
      id,
      createdAt: ic.time(),
      sessionIds: [],
      bukuDipinjam: [],
      name,
    };
    users.insert(id, user);
  
    return Result.Ok(user);
  }
  
  $update
  export function createBook(name: string): Result<Book, string> {
    // Parameter Validation
    if (!name) {
      return Result.Err<Book, string>("Invalid Parameter.");
    }
  
    const id = uuidv4();
    const buku: Book = {
      id,
      createdAt: ic.time(),
      name,
      dipinjam: false,
    };
    books.insert(id, buku);
  
    return Result.Ok(buku);
  }
  
  // Update operation to borrow a book
  $update
  export function borrowBook(id: string, idUser: string): Result<Book, string> {
    try {
      // Parameter Validation: Ensure that book ID and user ID are provided
      if (!id || !idUser) {
        return Result.Err<Book, string>("Invalid ID provided.");
      }
  
      const result = match(users.get(idUser), {
        Some: (user) =>
          match(books.get(id), {
            Some: (buku) => {
              if (buku.dipinjam) {
                return Result.Err<Book, string>("Book is already borrowed");
              }
              const updatedBuku: Book = {
                ...buku,
                dipinjam: true,
              };
              books.insert(buku.id, updatedBuku);
              user.bukuDipinjam.push(buku.id);
  
              return Result.Ok<Book, string>(updatedBuku);
            },
            None: () => Result.Err<Book, string>("Book does not exist"),
          }),
        None: () => Result.Err<Book, string>("User does not exist"),
      });
  
      return result;
    } catch (error) {
      return Result.Err<Book, string>(`Error borrowing book: ${error}`);
    }
  }
  
  // Update operation to return a book
  $update
  export function returnBook(id: string, idUser: string): Result<Book, string> {
    try {
      // Parameter Validation: Ensure that book ID and user ID are provided
      if (!id || !idUser) {
        return Result.Err<Book, string>("Invalid ID provided.");
      }
  
      const result = match(users.get(idUser), {
        Some: (user) =>
          match(books.get(id), {
            Some: (buku) => {
              if (!buku.dipinjam) {
                return Result.Err<Book, string>("Book is not currently borrowed");
              }
              const updatedBuku: Book = {
                ...buku,
                dipinjam: false,
              };
              books.insert(buku.id, updatedBuku);
              user.bukuDipinjam = user.bukuDipinjam.filter((b) => b !== buku.id);
  
              return Result.Ok<Book, string>(updatedBuku);
            },
            None: () => Result.Err<Book, string>("Book does not exist"),
          }),
        None: () => Result.Err<Book, string>("User does not exist"),
      });
  
      return result;
    } catch (error) {
      return Result.Err<Book, string>(`Error returning book: ${error}`);
    }
  }
  
  // Query operation to get a book by ID
  $query
  export function getBookById(id: string): Result<Book, string> {
    try {
      // Parameter Validation: Ensure that ID is provided
      if (!id) {
        return Result.Err<Book, string>("Invalid ID provided.");
      }
  
      return match(books.get(id), {
        Some: (buku) => Result.Ok<Book, string>(buku),
        None: () => Result.Err<Book, string>("Book not found"),
      });
    } catch (error) {
      return Result.Err<Book, string>(`Error getting book by ID: ${error}`);
    }
  }
  
  // Query operation to get a user by ID
  $query
  export function getUserById(id: string): Result<User, string> {
    try {
      // Parameter Validation: Ensure that ID is provided
      if (!id) {
        return Result.Err<User, string>("Invalid ID provided.");
      }
  
      return match(users.get(id), {
        Some: (user) => Result.Ok<User, string>(user),
        None: () => Result.Err<User, string>("User not found"),
      });
    } catch (error) {
      return Result.Err<User, string>(`Error getting user by ID: ${error}`);
    }
  }
  
  // Query operation to get all users
  $query
  export function getAllUsers(): Vec<User> {
    try {
      return users.values();
    } catch (error) {
      console.error(`Error getting all users: ${error}`);
      return [];
    }
  }
  
  // Query operation to get all books
  $query
  export function getAllBook(): Vec<Book> {
    try {
      return books.values();
    } catch (error) {
      console.error(`Error getting all books: ${error}`);
      return [];
    }
  }
  
  // Cryptographic utility for generating random values
  globalThis.crypto = {
    // @ts-ignore
    getRandomValues: () => {
      try {
        let array = new Uint8Array(32);
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      } catch (error) {
        console.error(`Error generating random values: ${error}`);
        return new Uint8Array(32); // Return an empty array in case of an error
      }
    },
  };
  