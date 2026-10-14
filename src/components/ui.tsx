import type { ButtonHTMLAttributes,ReactNode } from "react";
export function Button({variant="primary",className="",...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:"primary"|"secondary"|"ghost"|"danger"}) {
  return <button className={`button button-${variant} ${className}`} {...props}/>;
}
export function Alert({children,success=false}:{children:ReactNode;success?:boolean}) {
  return <div className={`alert ${success?"alert-success":""}`} role={success?"status":"alert"}>{children}</div>;
}
export function Avatar({name}:{name:string}) {return <span className="avatar">{name.slice(0,2).toUpperCase()}</span>;}
