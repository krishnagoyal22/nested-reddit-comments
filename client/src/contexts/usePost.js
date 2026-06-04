import { createContext, useContext } from "react"

export const Context = createContext()

export function usePost() {
  return useContext(Context)
}
