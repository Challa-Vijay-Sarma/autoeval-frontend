import { useDropzone } from "react-dropzone";

type Props = {
  file: File | null;
  onFile: (f: File | null) => void;
  disabled?: boolean;
};

export default function Dropzone({ file, onFile, disabled }: Props) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/zip": [".zip"] },
    multiple: false,
    disabled,
    onDrop: (accepted) => onFile(accepted[0] || null),
  });

  return (
    <div
      {...getRootProps()}
      className={`rounded-lg border-2 border-dashed p-10 text-center cursor-pointer transition ${
        isDragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400"
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      <input {...getInputProps()} />
      <div className="text-slate-600 text-sm">
        {file ? (
          <>
            <div className="font-medium text-slate-900">{file.name}</div>
            <div className="text-xs">{(file.size / (1024 * 1024)).toFixed(1)} MB — click or drop another to replace</div>
          </>
        ) : isDragActive ? (
          <>Drop the .zip here…</>
        ) : (
          <>
            <div className="font-medium text-slate-900">Drop your task_name.zip here</div>
            <div className="text-xs mt-1">or click to browse</div>
          </>
        )}
      </div>
    </div>
  );
}
