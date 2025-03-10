import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Trans, msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { match } from 'ts-pattern';

import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { trpc } from '@documenso/trpc/react';
import { Avatar, AvatarFallback, AvatarImage } from '@documenso/ui/primitives/avatar';
import { Button } from '@documenso/ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@documenso/ui/primitives/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@documenso/ui/primitives/select';
import { useToast } from '@documenso/ui/primitives/use-toast';

type MoveTemplateDialogProps = {
  templateId: number;
  open: boolean;
  onOpenChange: (_open: boolean) => void;
};

export const MoveTemplateDialog = ({ templateId, open, onOpenChange }: MoveTemplateDialogProps) => {
  const router = useRouter();

  const { toast } = useToast();
  const { _ } = useLingui();

  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  const { data: teams, isLoading: isLoadingTeams } = trpc.team.getTeams.useQuery();
  const { mutateAsync: moveTemplate, isPending } = trpc.template.moveTemplateToTeam.useMutation({
    onSuccess: () => {
      router.refresh();
      toast({
        title: _(msg`Template moved`),
        description: _(msg`The template has been successfully moved to the selected team.`),
        duration: 5000,
      });
      onOpenChange(false);
    },
    onError: (err) => {
      const error = AppError.parseError(err);

      const errorMessage = match(error.code)
        .with(
          AppErrorCode.NOT_FOUND,
          () => msg`Template not found or already associated with a team.`,
        )
        .with(AppErrorCode.UNAUTHORIZED, () => msg`You are not a member of this team.`)
        .otherwise(() => msg`An error occurred while moving the template.`);

      toast({
        title: _(msg`Error`),
        description: _(errorMessage),
        variant: 'destructive',
        duration: 7500,
      });
    },
  });

  const onMove = async () => {
    if (!selectedTeamId) {
      return;
    }

    await moveTemplate({ templateId, teamId: selectedTeamId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans>Move Template to Team</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>Select a team to move this template to. This action cannot be undone.</Trans>
          </DialogDescription>
        </DialogHeader>

        <Select onValueChange={(value) => setSelectedTeamId(Number(value))}>
          <SelectTrigger>
            <SelectValue placeholder={_(msg`Select a team`)} />
          </SelectTrigger>
          <SelectContent>
            {isLoadingTeams ? (
              <SelectItem value="loading" disabled>
                <Trans>Loading teams...</Trans>
              </SelectItem>
            ) : (
              teams?.map((team) => (
                <SelectItem key={team.id} value={team.id.toString()}>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-8 w-8">
                      {team.avatarImageId && (
                        <AvatarImage
                          src={`${NEXT_PUBLIC_WEBAPP_URL()}/api/avatar/${team.avatarImageId}`}
                        />
                      )}

                      <AvatarFallback className="text-sm text-gray-400">
                        {team.name.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <span>{team.name}</span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
          <Button onClick={onMove} loading={isPending} disabled={!selectedTeamId || isPending}>
            {isPending ? <Trans>Moving...</Trans> : <Trans>Move</Trans>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
