"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Field } from "@/components/admin/field";
import {
  getAcceptString,
  getMaxSizeForMime,
  isVideoMime,
  isVideoUrl,
} from "@/lib/services/media";
import { type FormState as StaticPageFormState } from "@/lib/types/form-state";
import { useFormActionToast } from "@/hooks/use-form-action-toast";

const MAX_VIDEO_DURATION_SECONDS = 20;
const RECOMMENDED_MIN_WIDTH = 1280;
const RECOMMENDED_MIN_HEIGHT = 720;
const RECOMMENDED_MIN_ASPECT = 1.3;

type Props = {
  saveAction: (
    prev: StaticPageFormState,
    formData: FormData,
  ) => Promise<StaticPageFormState>;
  removeAction: () => Promise<StaticPageFormState>;
  defaultMediaUrl: string | null;
  fallbackMediaUrl: string;
  canWrite: boolean;
};

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = url;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la duración del video"));
    };
  });
}

async function uploadHeroFile(
  file: File,
): Promise<{ ok: true; publicUrl: string } | { ok: false; message: string }> {
  const presignRes = await fetch("/api/admin/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      fileSize: file.size,
      prefix: "home",
    }),
  });

  if (!presignRes.ok) {
    const problem = await presignRes
      .json()
      .catch(() => ({ detail: "No se pudo iniciar la subida" }));
    return { ok: false, message: problem.detail ?? problem.title ?? "Error" };
  }

  const { presignedUrl, publicUrl } = (await presignRes.json()) as {
    presignedUrl: string;
    publicUrl: string;
  };

  const putRes = await fetch(presignedUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });

  if (!putRes.ok) {
    return { ok: false, message: "No se pudo subir el archivo" };
  }

  return { ok: true, publicUrl };
}

function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer las dimensiones de la imagen"));
    };
    img.src = url;
  });
}

export function HomeForm({
  saveAction,
  removeAction,
  defaultMediaUrl,
  fallbackMediaUrl,
  canWrite,
}: Props) {
  const [state, formAction, pending] = useActionState(
    saveAction,
    {} as StaticPageFormState,
  );
  useFormActionToast(state, "Hero del Home actualizado");

  const [currentUrl, setCurrentUrl] = useState<string | null>(defaultMediaUrl);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, startRemoveTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayUrl = pendingUrl ?? currentUrl ?? fallbackMediaUrl;
  const displayIsCustom = pendingUrl !== null || currentUrl !== null;
  const displayIsVideo = isVideoUrl(displayUrl);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = getMaxSizeForMime(file.type);
    if (file.size > maxSize) {
      const limitMB = maxSize / (1024 * 1024);
      const label = isVideoMime(file.type) ? "Los videos" : "Las imágenes";
      toast.error(`${label} deben pesar menos de ${limitMB}MB`, {
        description: file.name,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (isVideoMime(file.type)) {
      try {
        const duration = await readVideoDuration(file);
        if (duration > MAX_VIDEO_DURATION_SECONDS) {
          toast.error(
            `El video debe durar máximo ${MAX_VIDEO_DURATION_SECONDS} segundos`,
            {
              description: `Tu video dura ${Math.round(duration)} s`,
            },
          );
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
      } catch {
        toast.error("No se pudo verificar la duración del video");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    } else {
      try {
        const { width, height } = await readImageDimensions(file);
        const aspect = width / height;
        if (
          width < RECOMMENDED_MIN_WIDTH ||
          height < RECOMMENDED_MIN_HEIGHT ||
          aspect < RECOMMENDED_MIN_ASPECT
        ) {
          toast.warning("La imagen puede verse borrosa o mal recortada", {
            description: `Recomendado: ≥${RECOMMENDED_MIN_WIDTH}×${RECOMMENDED_MIN_HEIGHT} y horizontal. Tu imagen es ${width}×${height}.`,
          });
        }
      } catch {
        // Si no podemos leer dimensiones, no bloqueamos.
      }
    }

    setUploading(true);
    try {
      const result = await uploadHeroFile(file);
      if (!result.ok) {
        toast.error(result.message, { description: file.name });
        return;
      }
      setPendingUrl(result.publicUrl);
      toast.success("Archivo subido. Guarda los cambios para publicarlo.", {
        description: file.name,
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleRemove() {
    startRemoveTransition(async () => {
      const result = await removeAction();
      if ("type" in result) {
        toast.error(result.detail ?? result.title);
        return;
      }
      toast.success("Hero restablecido al medio por defecto");
      setPendingUrl(null);
      setCurrentUrl(null);
    });
  }

  const finalUrlForSave = pendingUrl ?? currentUrl ?? "";

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="heroMediaUrl" value={finalUrlForSave} />

      <Field label="Vista previa">
        <div className="relative h-72 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          {displayIsVideo ? (
            <video
              key={displayUrl}
              src={displayUrl}
              className="h-full w-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <img
              key={displayUrl}
              src={displayUrl}
              alt="Hero del Home"
              className="h-full w-full object-cover"
            />
          )}
          {!displayIsCustom && (
            <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
              Mostrando hero por defecto
            </span>
          )}
        </div>
      </Field>

      {canWrite && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
          <p className="text-sm font-medium text-slate-700">
            Sube una foto o un video corto
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Imagen: hasta 5 MB · recomendado ≥1280×720 horizontal.
            <br />
            Video: hasta 20 MB y máximo {MAX_VIDEO_DURATION_SECONDS}{" "}
            segundos. Se reproduce en silencio y en bucle.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept={getAcceptString()}
              onChange={handleFileChange}
              disabled={uploading || pending || removing}
              className="block w-full max-w-md text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground hover:file:bg-primary/90"
            />
            {uploading && (
              <span className="text-xs text-slate-500">Subiendo…</span>
            )}
          </div>
        </div>
      )}

      {canWrite && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {currentUrl !== null && (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    disabled={removing || pending || uploading}
                  >
                    {removing ? "Eliminando…" : "Eliminar"}
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar el medio del hero?</AlertDialogTitle>
                  <AlertDialogDescription>
                    El sitio público volverá a mostrar el hero por defecto y el
                    archivo se borrará del almacenamiento. Esta acción no se
                    puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel render={<Button variant="outline" />}>
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    render={
                      <Button variant="destructive" onClick={handleRemove} />
                    }
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <Button
            type="submit"
            disabled={pending || uploading || removing || finalUrlForSave === ""}
            className="h-10 rounded-xl bg-secondary px-5 text-white hover:bg-green-800"
          >
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      )}
    </form>
  );
}
