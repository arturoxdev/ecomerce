"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Locale } from "@/lib/i18n/config";

import { createFaqEntry, deleteFaqEntry, updateFaqEntry } from "../../actions";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
};

type Props = {
  locale: Locale;
  items: FaqItem[];
  canWrite: boolean;
};

type Draft = {
  question: string;
  answer: string;
  sortOrder: string;
};

const emptyDraft: Draft = {
  question: "",
  answer: "",
  sortOrder: "0",
};

export function FaqManager({ locale, items, canWrite }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createDraft, setCreateDraft] = useState<Draft>({
    ...emptyDraft,
    sortOrder: String(items.length),
  });
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);

  const editingItem = useMemo(
    () => items.find((item) => item.id === editId) ?? null,
    [editId, items],
  );

  function openEdit(item: FaqItem) {
    setEditId(item.id);
    setEditDraft({
      question: item.question,
      answer: item.answer,
      sortOrder: String(item.sortOrder),
    });
  }

  function submitCreate() {
    startTransition(async () => {
      const result = await createFaqEntry(locale, {
        question: createDraft.question,
        answer: createDraft.answer,
        sortOrder: Number(createDraft.sortOrder),
      });

      if ("type" in result) {
        toast.error(result.detail ?? result.title);
        return;
      }

      toast.success("FAQ entry created");
      setCreateOpen(false);
      setCreateDraft({ ...emptyDraft, sortOrder: String(items.length + 1) });
      router.refresh();
    });
  }

  function submitEdit() {
    if (!editId) return;

    startTransition(async () => {
      const result = await updateFaqEntry(editId, locale, {
        question: editDraft.question,
        answer: editDraft.answer,
        sortOrder: Number(editDraft.sortOrder),
      });

      if ("type" in result) {
        toast.error(result.detail ?? result.title);
        return;
      }

      toast.success("FAQ entry updated");
      setEditId(null);
      router.refresh();
    });
  }

  function confirmDelete() {
    if (!deleteId) return;

    startTransition(async () => {
      const result = await deleteFaqEntry(deleteId);
      setDeleteId(null);
      if ("type" in result) {
        toast.error(result.detail ?? result.title);
        return;
      }

      toast.success("FAQ entry deleted");
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Questions and answers</h2>
          <p className="mt-1 text-sm text-slate-600">
            Manage the FAQ entries rendered on the public page for this locale.
          </p>
        </div>
        {canWrite ? (
          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="h-10 rounded-xl bg-secondary px-4 text-white hover:bg-green-800"
          >
            <Plus className="size-4" />
            Add question
          </Button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#f1f5f9] bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#fafaf9] hover:bg-[#fafaf9]">
              <TableHead className="px-5 py-4 text-slate-500">Order</TableHead>
              <TableHead className="px-5 py-4 text-slate-500">Question</TableHead>
              <TableHead className="px-5 py-4 text-slate-500">Answer</TableHead>
              {canWrite ? (
                <TableHead className="px-5 py-4 text-right text-slate-500">
                  Actions
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="hover:bg-[#fcfbfa]">
                <TableCell className="px-5 py-4 font-medium text-slate-700">
                  {item.sortOrder}
                </TableCell>
                <TableCell className="px-5 py-4 font-medium text-slate-900">
                  {item.question}
                </TableCell>
                <TableCell className="max-w-xl px-5 py-4 text-sm leading-6 text-slate-600">
                  {item.answer}
                </TableCell>
                {canWrite ? (
                  <TableCell className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(item.id)}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create FAQ entry</DialogTitle>
            <DialogDescription>
              Add a question and answer for the selected locale.
            </DialogDescription>
          </DialogHeader>
          <FaqFields draft={createDraft} setDraft={setCreateDraft} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button disabled={isPending} onClick={submitCreate}>
              {isPending ? "Saving..." : "Save entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editId} onOpenChange={(open) => !open && setEditId(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit FAQ entry</DialogTitle>
            <DialogDescription>
              Update the content visible on the public FAQ page.
            </DialogDescription>
          </DialogHeader>
          <FaqFields draft={editDraft} setDraft={setEditDraft} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>
              Cancel
            </Button>
            <Button disabled={isPending || !editingItem} onClick={submitEdit}>
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete FAQ entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This question will be removed from the admin table and the public FAQ
              page for the selected locale.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function FaqFields({
  draft,
  setDraft,
}: {
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Question</Label>
        <Input
          value={draft.question}
          onChange={(event) =>
            setDraft((current) => ({ ...current, question: event.target.value }))
          }
        />
      </div>
      <div className="space-y-2">
        <Label>Answer</Label>
        <textarea
          rows={6}
          value={draft.answer}
          onChange={(event) =>
            setDraft((current) => ({ ...current, answer: event.target.value }))
          }
          className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary"
        />
      </div>
      <div className="space-y-2">
        <Label>Sort order</Label>
        <Input
          type="number"
          min="0"
          value={draft.sortOrder}
          onChange={(event) =>
            setDraft((current) => ({ ...current, sortOrder: event.target.value }))
          }
        />
      </div>
    </div>
  );
}
