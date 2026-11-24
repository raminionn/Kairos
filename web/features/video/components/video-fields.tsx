import { Dropzone } from "@/components/ui/dropzone";
import { Field } from "@/components/ui/field";

export function VideoFields() {
  return (
    <Field label="Video">
      <Dropzone name="file" accept=".mp4,.mov,.mkv,.webm" label="Choose a long video" hint="MP4, MOV, MKV or WebM" />
    </Field>
  );
}
