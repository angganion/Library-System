import {
    Canister,
    ic,
    Err,
    nat64,
    Ok,
    Principal,
    query,
    Record,
    Result,
    StableBTreeMap,
    text,
    update,
    Variant,
    Vec,
    bool,
} from 'azle';
import { v4 as uuidv4 } from 'uuid';

const User = Record({
    id: text,
    createdAt: nat64,
    sessionIds: Vec(Principal),
    bukuDipinjam: Vec(text),
    name: text
});

const Book = Record({
    id: text,
    createdAt: nat64,
    name: text,
    dipinjam : bool,
});

const Errors = Variant({
    UserDoesNotExist: text,
    booksDoesNotExist: text
});

let users = StableBTreeMap(text, User, 0);
let bukus = StableBTreeMap(text, Book, 1);


export default Canister({
    /**
     * Creates a new user.
     * @param name - Name for the user.
     * @returns the newly created user instance.
    */
    createUser: update([text], User, (name) => {
        const id = uuidv4();
        const user: typeof User = {
            id,
            createdAt: ic.time(),
            sessionIds: [],
            bukuDipinjam: [],
            name
        }
        users.insert(user.id, user)

        return user
    }),

    createBook: update([text], Book, (name) => {
        const id = uuidv4();
        const buku: typeof Book = {
            id,
            createdAt: ic.time(),
            name,
            dipinjam: false
        }
        bukus.insert(buku.id, buku)

        return buku
    }
    ),

    borrowBook: update([text, text], Result(Book, Errors), (id, idUser) => {
        const buku = bukus.get(id).Some;
        const user = users.get(idUser).Some;
        if (buku.dipinjam) {
            return Err({booksDoesNotExist: id})
        }
        const updatedBuku: typeof Book = {
            ...buku,
            dipinjam: true
        }
        bukus.insert(buku.id, updatedBuku);
        user.bukuDipinjam.push(buku.id);
        return Ok(updatedBuku);
    }
    ),

    returnBook : update([text, text], Result(Book, Errors), (id, idUser) => {
        const buku = bukus.get(id).Some;
        const user = users.get(idUser).Some;
        if (!buku.dipinjam) {
            return Err({booksDoesNotExist: id})
        }
        const updatedBuku: typeof Book = {
            ...buku,
            dipinjam: false
        }
        bukus.insert(buku.id, updatedBuku);
        for (let i = 0; i < user.bukuDipinjam.length; i++) {
            if (user.bukuDipinjam[i] === buku.id) {
                user.bukuDipinjam.splice(i, 1);
            }
        }
        return Ok(updatedBuku);
    }
    ),

    getBookById: query([text], Result(Book, Errors), (id) => {
        if (!bukus.containsKey(id)) {
            return Err({booksDoesNotExist: id})
        }
        const buku = bukus.get(id).Some;

        return Ok(buku);
    }
    ),
    
    /**
     * Fetch user by id.
     * @returns a user instance if exists or an error if user doesn't exists.
    */
    getUserById: query([text], Result(User, Errors), (id) => {
        if (!users.containsKey(id)) {
            return Err({UserDoesNotExist: id})
        }
        const user = users.get(id).Some;

        return Ok(user);
    }),
    /**
     * Fetch all users.
     * @returns a list of all users.
    */
    getAllUsers: query([], Vec(User), () => {
        return users.values();
    }),
    /**
     * Delete a user by id.
     * @param id - ID of the user.
     * @returns the deleted instance of the user or an error msg if user id doesn't exists.
    */

    getAllBook: query([], Vec(Book), () => {
        return bukus.values();
    }
    ),

});