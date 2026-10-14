"use client";
import { useEffect,useRef } from "react";
import { X } from "lucide-react";
export function Modal({title,children,onClose}:{title:string;children:React.ReactNode;onClose:()=>void}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const dialog=ref.current;dialog?.showModal();return()=>{dialog?.close();};},[]);
  return <dialog ref={ref} className="modal" onCancel={onClose} aria-label={title}><div className="modal-heading"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Zatvori"><X size={20}/></button></div>{children}</dialog>;
}
