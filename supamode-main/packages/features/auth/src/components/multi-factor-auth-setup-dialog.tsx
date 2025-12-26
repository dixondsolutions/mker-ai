'use client';

import { useCallback, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { useFactorsMutationKey } from '@kit/supabase/hooks/use-user-factors-mutation-key';
import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@kit/ui/alert-dialog';
import { Button } from '@kit/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { If } from '@kit/ui/if';
import { Input } from '@kit/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@kit/ui/input-otp';
import { toast } from '@kit/ui/sonner';
import { Trans } from '@kit/ui/trans';

export function MultiFactorAuthSetupDialog(props: { userId: string }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const queryClient = useQueryClient();
  const mutationKey = useFactorsMutationKey(props.userId);

  const onEnrollSuccess = useCallback(() => {
    setIsOpen(false);

    return toast.success(t(`settings:authentication.multiFactorSetupSuccess`));
  }, [t]);

  const onCancel = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: mutationKey });
    setIsOpen(false);
  }, [queryClient, mutationKey]);

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button>
          <Trans i18nKey={'settings:authentication.setupMfaButtonLabel'} />
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans i18nKey={'settings:authentication.setupMfaButtonLabel'} />
          </AlertDialogTitle>

          <AlertDialogDescription>
            <Trans
              i18nKey={'settings:authentication.multiFactorAuthDescription'}
            />
          </AlertDialogDescription>
        </AlertDialogHeader>

        <MultiFactorAuthSetupForm
          userId={props.userId}
          onCancel={onCancel}
          onEnrolled={onEnrollSuccess}
        />
      </AlertDialogContent>
    </AlertDialog>
  );
}

function MultiFactorAuthSetupForm({
  userId,
  onEnrolled,
  onCancel,
}: React.PropsWithChildren<{
  userId: string;
  onCancel: () => void;
  onEnrolled: () => void;
}>) {
  const verifyCodeMutation = useVerifyCodeMutation({ userId });

  const verificationCodeForm = useForm({
    resolver: zodResolver(
      z.object({
        factorId: z.string().min(1),
        verificationCode: z.string().min(6).max(6),
      }),
    ),
    defaultValues: {
      factorId: '',
      verificationCode: '',
    },
  });

  const [state, setState] = useState({
    loading: false,
    error: '',
  });

  const onSetFactorId = useCallback(
    (factorId: string) => {
      verificationCodeForm.setValue('factorId', factorId);
    },
    [verificationCodeForm],
  );

  const currentFactorId = useWatch({
    control: verificationCodeForm.control,
    name: 'factorId',
  });

  const onSubmit = useCallback(
    async ({
      verificationCode,
      factorId,
    }: {
      verificationCode: string;
      factorId: string;
    }) => {
      setState({
        loading: true,
        error: '',
      });

      try {
        await verifyCodeMutation.mutateAsync({
          factorId,
          code: verificationCode,
        });

        setState({
          loading: false,
          error: '',
        });

        onEnrolled();
      } catch (error) {
        const message = (error as Error).message || `Unknown error`;

        setState({
          loading: false,
          error: message,
        });
      }
    },
    [onEnrolled, verifyCodeMutation],
  );

  if (state.error) {
    return (
      <div className={'flex flex-col space-y-4'}>
        <ErrorAlert />

        <div className={'flex justify-end'}>
          <Button type={'button'} variant={'ghost'} onClick={onCancel}>
            <Trans i18nKey={'common:cancel'} />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={'flex flex-col space-y-4'}>
      <div className={'flex justify-center'}>
        <FactorQrCode
          userId={userId}
          onCancel={onCancel}
          onSetFactorId={onSetFactorId}
        />
      </div>

      <If condition={currentFactorId}>
        <Form {...verificationCodeForm}>
          <form
            onSubmit={verificationCodeForm.handleSubmit(onSubmit)}
            className={'w-full'}
          >
            <div className={'flex flex-col space-y-8'}>
              <FormField
                render={({ field }) => {
                  return (
                    <FormItem
                      className={
                        'mx-auto flex flex-col items-center justify-center'
                      }
                    >
                      <FormControl>
                        <InputOTP {...field} maxLength={6} minLength={6}>
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                          </InputOTPGroup>
                          <InputOTPSeparator />
                          <InputOTPGroup>
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </FormControl>

                      <FormDescription>
                        <Trans
                          i18nKey={
                            'settings:authentication.verifyActivationCodeDescription'
                          }
                        />
                      </FormDescription>

                      <FormMessage />
                    </FormItem>
                  );
                }}
                name={'verificationCode'}
              />

              <div className={'flex justify-end space-x-2'}>
                <Button type={'button'} variant={'ghost'} onClick={onCancel}>
                  <Trans i18nKey={'common:cancel'} />
                </Button>

                <Button type={'submit'}>
                  {state.loading ? (
                    <Trans i18nKey={'settings:authentication.verifyingCode'} />
                  ) : (
                    <Trans
                      i18nKey={'settings:authentication.enableMfaFactor'}
                    />
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </If>
    </div>
  );
}

function FactorQrCode({
  onSetFactorId,
  onCancel,
  userId,
}: React.PropsWithChildren<{
  userId: string;
  onCancel: () => void;
  onSetFactorId: (factorId: string) => void;
}>) {
  const enrollFactorMutation = useEnrollFactor({ userId });
  const { t } = useTranslation();
  const [error, setError] = useState<string>('');

  const form = useForm({
    resolver: zodResolver(
      z.object({
        factorName: z.string().min(1),
        qrCode: z.string().min(1),
      }),
    ),
    defaultValues: {
      factorName: '',
      qrCode: '',
    },
  });

  const factorName = useWatch({
    control: form.control,
    name: 'factorName',
  });

  const onSetFactorName = useCallback(
    async (name: string) => {
      const response = await enrollFactorMutation.mutateAsync(name);

      if (!response.success) {
        return setError(response.data as string);
      }

      const data = response.data;

      if (data.type === 'totp') {
        form.setValue('factorName', name);
        form.setValue('qrCode', data.totp.qr_code);

        // dispatch event to set factor ID
        onSetFactorId(data.id);
      }
    },
    [enrollFactorMutation, form, onSetFactorId, setError],
  );

  if (error) {
    return (
      <div className={'flex w-full flex-col space-y-2'}>
        <Alert variant={'destructive'}>
          <ExclamationTriangleIcon className={'h-4'} />

          <AlertTitle>
            <Trans i18nKey={'settings:authentication.qrCodeErrorHeading'} />
          </AlertTitle>

          <AlertDescription>
            <Trans
              i18nKey={`auth:errors.${error}`}
              defaults={t('settings:authentication.qrCodeErrorDescription')}
            />
          </AlertDescription>
        </Alert>

        <div>
          <Button variant={'outline'} onClick={onCancel}>
            <ArrowLeftIcon className={'h-4'} />
            <Trans i18nKey={`common:retry`} />
          </Button>
        </div>
      </div>
    );
  }

  if (!factorName) {
    return (
      <FactorNameForm onCancel={onCancel} onSetFactorName={onSetFactorName} />
    );
  }

  return (
    <div className={'flex flex-col space-y-4'}>
      <p>
        <span className={'text-muted-foreground text-sm'}>
          <Trans i18nKey={'settings:authentication.multiFactorModalHeading'} />
        </span>
      </p>

      <div className={'flex justify-center'}>
        <QrImage src={form.getValues('qrCode')} />
      </div>
    </div>
  );
}

function FactorNameForm(
  props: React.PropsWithChildren<{
    onSetFactorName: (name: string) => void;
    onCancel: () => void;
  }>,
) {
  const form = useForm({
    resolver: zodResolver(
      z.object({
        name: z.string().min(1),
      }),
    ),
    defaultValues: {
      name: '',
    },
  });

  return (
    <Form {...form}>
      <form
        className={'w-full'}
        onSubmit={form.handleSubmit((data) => {
          props.onSetFactorName(data.name);
        })}
      >
        <div
          className={
            'dark:bg-secondary flex flex-col space-y-4 rounded-lg border p-4'
          }
        >
          <FormField
            name={'name'}
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel>
                    <Trans
                      i18nKey={'settings:authentication.factorNameLabel'}
                    />
                  </FormLabel>

                  <FormControl>
                    <Input autoComplete={'off'} required {...field} />
                  </FormControl>

                  <FormDescription>
                    <Trans i18nKey={'settings:authentication.factorNameHint'} />
                  </FormDescription>

                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <div className={'flex justify-end space-x-2'}>
            <Button type={'button'} variant={'ghost'} onClick={props.onCancel}>
              <Trans i18nKey={'common:cancel'} />
            </Button>

            <Button type={'submit'}>
              <Trans
                i18nKey={'settings:authentication.factorNameSubmitLabel'}
              />
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

function QrImage({ src }: { src: string }) {
  return (
    <img
      alt={'QR Code'}
      src={src}
      width={160}
      height={160}
      className={'bg-white p-2'}
    />
  );
}

function useEnrollFactor(props: { userId: string }) {
  const client = useSupabase();
  const mutationKey = useFactorsMutationKey(props.userId);

  const mutationFn = async (factorName: string) => {
    const response = await client.auth.mfa.enroll({
      friendlyName: factorName,
      factorType: 'totp',
    });

    if (response.error) {
      return {
        success: false as const,
        data: response.error.code,
      };
    }

    return {
      success: true as const,
      data: response.data,
    };
  };

  return useMutation({
    mutationFn,
    mutationKey,
  });
}

function useVerifyCodeMutation(props: { userId: string }) {
  const mutationKey = useFactorsMutationKey(props.userId);
  const client = useSupabase();
  const queryClient = useQueryClient();

  const mutationFn = async (params: { factorId: string; code: string }) => {
    const challenge = await client.auth.mfa.challenge({
      factorId: params.factorId,
    });

    if (challenge.error) {
      throw challenge.error;
    }

    const challengeId = challenge.data.id;

    const verify = await client.auth.mfa.verify({
      factorId: params.factorId,
      code: params.code,
      challengeId,
    });

    if (verify.error) {
      throw verify.error;
    }

    return verify;
  };

  return useMutation({
    mutationKey,
    mutationFn,
    onSuccess: () => {
      return queryClient.refetchQueries({ queryKey: mutationKey });
    },
  });
}

function ErrorAlert() {
  return (
    <Alert variant={'destructive'}>
      <ExclamationTriangleIcon className={'h-4'} />

      <AlertTitle>
        <Trans
          i18nKey={'settings:authentication.multiFactorSetupErrorHeading'}
        />
      </AlertTitle>

      <AlertDescription>
        <Trans
          i18nKey={'settings:authentication.multiFactorSetupErrorDescription'}
        />
      </AlertDescription>
    </Alert>
  );
}
