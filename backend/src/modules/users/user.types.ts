/** Public user profile: never contains credentials. */
export interface User {
  id: string;
  displayName: string;
  email: string;
  createdAt: string;
}

/** Internal shape used only by authentication. */
export interface UserWithCredentials extends User {
  passwordHash: string | null;
}

export interface CreateUserInput {
  displayName: string;
  email: string;
  passwordHash: string;
}

export interface UserRepository {
  create(input: CreateUserInput): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmailWithCredentials(email: string): Promise<UserWithCredentials | null>;
  findManyByIds(ids: readonly string[]): Promise<User[]>;
  list(): Promise<User[]>;
}
