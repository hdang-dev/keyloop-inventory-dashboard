import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { ApiError } from '@/api/client';
import { NativeSelect } from '@/components/NativeSelect';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ACTION_NOTE_MAX_LENGTH,
  ACTION_STATUS_LABELS,
  ACTION_STATUSES,
  type ActionStatus,
  type VehicleAction,
} from '@/domain/types';
import { useSaveAction } from '@/hooks/useSaveAction';

const actionFormSchema = z.object({
  status: z.enum(ACTION_STATUSES, { error: 'Select a status' }),
  note: z
    .string()
    .max(ACTION_NOTE_MAX_LENGTH, `Keep the note to ${ACTION_NOTE_MAX_LENGTH} characters or fewer`),
});

type ActionFormInput = z.input<typeof actionFormSchema>;
type ActionFormValues = z.output<typeof actionFormSchema>;

function toFormValues(action: VehicleAction | null): ActionFormInput {
  // The empty string is the select's placeholder option, which validation rejects.
  return { status: (action?.status ?? '') as ActionStatus, note: action?.note ?? '' };
}

interface ActionFormProps {
  vehicleId: string;
  currentAction: VehicleAction | null;
}

export function ActionForm({ vehicleId, currentAction }: ActionFormProps) {
  const saveAction = useSaveAction(vehicleId);
  const [hasConflict, setHasConflict] = useState(false);
  const form = useForm<ActionFormInput, unknown, ActionFormValues>({
    resolver: zodResolver(actionFormSchema),
    defaultValues: toFormValues(currentAction),
  });
  const { errors, isDirty } = form.formState;

  // The version the user is editing from. An untouched form follows the latest data, but once
  // the user starts editing it stays put, so a change made elsewhere meanwhile is reported as a
  // conflict instead of being silently overwritten when polling or tab focus refreshes the panel.
  const baseVersion = useRef(currentAction?.version ?? 0);

  useEffect(() => {
    if (isDirty) return;
    baseVersion.current = currentAction?.version ?? 0;
    form.reset(toFormValues(currentAction));
  }, [form, isDirty, currentAction]);

  function onSubmit({ status, note }: ActionFormValues) {
    setHasConflict(false);
    saveAction.mutate(
      { status, note: note || null, version: baseVersion.current },
      {
        onSuccess: ({ currentAction: saved }) => {
          baseVersion.current = saved.version;
          form.reset(toFormValues(saved));
        },
        onError: (error) => {
          if (error instanceof ApiError && error.code === 'VERSION_CONFLICT') {
            baseVersion.current = error.currentAction?.version ?? 0;
            form.reset(toFormValues(error.currentAction ?? null));
            setHasConflict(true);
          }
        },
      },
    );
  }

  const note = useWatch({ control: form.control, name: 'note' });

  return (
    <form
      aria-label="Log an action"
      className="flex flex-col gap-4"
      onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
      noValidate
    >
      {hasConflict && (
        <Alert variant="destructive">
          <AlertTitle>Updated by someone else</AlertTitle>
          <AlertDescription>
            Your change was not saved. This panel now shows the latest action; review it and save
            again if needed.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="action-status">Status</Label>
        <NativeSelect
          id="action-status"
          aria-invalid={errors.status ? true : undefined}
          aria-describedby={errors.status ? 'action-status-error' : undefined}
          {...form.register('status')}
        >
          <option value="">Choose a status</option>
          {ACTION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {ACTION_STATUS_LABELS[status]}
            </option>
          ))}
        </NativeSelect>
        {errors.status && (
          <p id="action-status-error" className="text-xs text-destructive">
            {errors.status.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="action-note">Note (optional)</Label>
        <Textarea
          id="action-note"
          rows={3}
          className="bg-card"
          aria-invalid={errors.note ? true : undefined}
          aria-describedby={errors.note ? 'action-note-error' : 'action-note-count'}
          {...form.register('note')}
        />
        {errors.note ? (
          <p id="action-note-error" className="text-xs text-destructive">
            {errors.note.message}
          </p>
        ) : (
          <p id="action-note-count" className="text-xs text-muted-foreground">
            {note?.length ?? 0}/{ACTION_NOTE_MAX_LENGTH}
          </p>
        )}
      </div>

      <Button type="submit" className="self-start" disabled={saveAction.isPending}>
        {saveAction.isPending ? 'Saving…' : 'Save action'}
      </Button>
    </form>
  );
}
