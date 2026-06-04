import { createElement } from "react"
import "../styles.css"

export function IconBtn({ Icon: IconComponent, isActive, color, children, ...props }) {
  return (
    <button
      className={`btn icon-btn ${isActive ? "icon-btn-active" : ""} ${
        color || ""
      }`}
      {...props}
    >
      <span className={`${children != null ? "mr-1" : ""}`}>
        {createElement(IconComponent)}
      </span>
      {children}
    </button>
  )
}
