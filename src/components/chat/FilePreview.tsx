import { FileText, X } from "lucide-react";

interface FilePreviewProps {
  file: File;
  onRemove: () => void;
}

const FilePreview = ({ file, onRemove }: FilePreviewProps) => {
  const isImage = file.type.startsWith("image/");
  const url = isImage ? URL.createObjectURL(file) : null;

  return (
    <div className="relative inline-flex items-center gap-2 bg-muted rounded-lg p-2 pr-8 max-w-[200px]">
      {isImage && url ? (
        <img src={url} alt={file.name} className="h-12 w-12 rounded object-cover" />
      ) : (
        <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
      )}
      <span className="text-xs text-foreground truncate">{file.name}</span>
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};

export default FilePreview;
