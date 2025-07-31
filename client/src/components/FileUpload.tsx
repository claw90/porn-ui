import { useRef } from "react";
import { CloudUpload, Video, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  accept: string;
  onFileSelect: (file: File) => void;
  description: string;
  subDescription: string;
  icon: "video" | "user";
  compact?: boolean;
  className?: string;
}

export default function FileUpload({
  accept,
  onFileSelect,
  description,
  subDescription,
  icon,
  compact = false,
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const IconComponent = icon === "video" ? Video : User;

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className={cn(
        "border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-primary transition-colors cursor-pointer",
        compact ? "p-4" : "p-8",
        className
      )}
    >
      {!compact && <CloudUpload className="h-8 w-8 text-gray-400 mx-auto mb-4" />}
      {compact && <IconComponent className="h-6 w-6 text-gray-400 mx-auto mb-2" />}
      
      <p className={cn("text-gray-600 mb-2", compact ? "text-sm" : "text-base")}>
        {description} <span className="text-primary font-medium">browse</span>
      </p>
      <p className={cn("text-gray-500", compact ? "text-xs" : "text-sm")}>
        {subDescription}
      </p>
      
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
