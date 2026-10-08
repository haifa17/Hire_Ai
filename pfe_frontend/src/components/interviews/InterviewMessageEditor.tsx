type InterviewMessageEditorProps = {
  message: string;
  notes: string;
  onMessageChange: (value: string) => void;
  onNotesChange: (value: string) => void;
};

export function InterviewMessageEditor({
  message,
  notes,
  onMessageChange,
  onNotesChange,
}: InterviewMessageEditorProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <label
          className="text-sm font-semibold text-slate-900"
          htmlFor="candidate-message"
        >
          Message to candidate
        </label>
        <textarea
          id="candidate-message"
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          placeholder="Add preparation instructions, meeting link details, or context."
          className="form-textarea mt-2 min-h-28"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <label
          className="text-sm font-semibold text-slate-900"
          htmlFor="recruiter-notes"
        >
          Recruiter notes
        </label>
        <textarea
          id="recruiter-notes"
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Internal notes for interview panel, topics to validate, and concerns."
          className="form-textarea mt-2 min-h-28"
        />
      </div>
    </div>
  );
}
