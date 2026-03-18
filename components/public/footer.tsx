import { Facebook, Instagram } from "lucide-react";

type Props = {
  rights: string;
};

export function PublicFooter({ rights }: Props) {
  return (
    <footer className="border-t border-slate-200 bg-[#f8fafc]">
      <div className="mx-auto max-w-7xl px-8 py-8 md:flex md:items-center md:justify-between lg:px-20">
        <div className="flex justify-center space-x-6 md:order-2">
          <a className="text-slate-400 hover:text-slate-500" href="#">
            <span className="sr-only">Facebook</span>
            <Facebook aria-hidden="true" className="h-6 w-6" />
          </a>
          <a className="text-slate-400 hover:text-slate-500" href="#">
            <span className="sr-only">Instagram</span>
            <Instagram aria-hidden="true" className="h-6 w-6" />
          </a>
        </div>
        <div className="mt-8 md:order-1 md:mt-0">
          <p className="text-center text-xs leading-5 text-slate-500">
            {rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
