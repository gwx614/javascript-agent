export interface Question {
  id: string | number;
  question: string;
  type: "select" | "textarea" | "checkbox";
  options?: string[];
  placeholder?: string;
}

export interface UserProfile {
  username?: string;
  rolePosition?: string;
  roleReport?: string;
  [key: string]: any;
}
