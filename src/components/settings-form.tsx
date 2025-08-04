
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import type { UpdateUserSettings } from '@/lib/types';
import { UpdateUserSettingsSchema } from '@/lib/types';
import { useAuth } from './auth-provider';
import { db, auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, FileDown, Trash2 } from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Skeleton } from './ui/skeleton';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Separator } from './ui/separator';

export function SettingsForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const form = useForm<UpdateUserSettings>({
    resolver: zodResolver(UpdateUserSettingsSchema),
    defaultValues: {
      displayName: '',
      moodTrackingEnabled: true,
      passiveAudioEnabled: true,
      faceEmotionEnabled: false,
      dataExportEnabled: true,
      narratorVolume: 0.8,
      ttsVoice: 'warmCalm',
      gpsAllowed: false,
      dataConsent: {
          shareAnonymousData: false,
          optedOutAt: null,
      },
      allowVoiceRetention: true,
      receiveWeeklyEmail: true,
      receiveMilestones: true,
      emailTone: 'poetic',
    },
  });

  useEffect(() => {
    async function fetchUserData() {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const settings = userData.settings || {};
            form.reset({
              displayName: userData.displayName || user.displayName || '',
              ...settings,
              dataConsent: settings.dataConsent || { shareAnonymousData: false, optedOutAt: null },
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          toast({
            variant: "destructive",
            title: "Failed to load settings",
            description: "Could not fetch your current settings. Please try again later."
          })
        } finally {
          setIsLoadingData(false);
        }
      }
    }
    fetchUserData();
  }, [user, form, toast]);

  async function onSubmit(data: UpdateUserSettings) {
    if (!user) return;
    setIsSubmitting(true);
    try {
      // When user toggles sharing off, set the optedOutAt timestamp
      const currentConsent = form.getValues('dataConsent.shareAnonymousData');
      if (currentConsent && !data.dataConsent?.shareAnonymousData) {
          if (data.dataConsent) {
              data.dataConsent.optedOutAt = Date.now();
          }
      } else if (!currentConsent && data.dataConsent?.shareAnonymousData) {
          if (data.dataConsent) {
              data.dataConsent.optedOutAt = null;
          }
      }
      
      const userRef = doc(db, "users", user.uid);
      const updatePayload: Record<string, unknown> = {
          displayName: data.displayName,
          'settings.moodTrackingEnabled': data.moodTrackingEnabled,
          'settings.passiveAudioEnabled': data.passiveAudioEnabled,
          'settings.faceEmotionEnabled': data.faceEmotionEnabled,
          'settings.dataExportEnabled': data.dataExportEnabled,
          'settings.narratorVolume': data.narratorVolume,
          'settings.ttsVoice': data.ttsVoice,
          'settings.gpsAllowed': data.gpsAllowed,
          'settings.dataConsent': data.dataConsent,
          'settings.allowVoiceRetention': data.allowVoiceRetention,
          'settings.receiveWeeklyEmail': data.receiveWeeklyEmail,
          'settings.receiveMilestones': data.receiveMilestones,
          'settings.emailTone': data.emailTone,
      };

      const dbUpdatePromise = updateDoc(userRef, updatePayload);
      const authUpdatePromise = updateProfile(auth.currentUser!, { displayName: data.displayName });
      
      await Promise.all([dbUpdatePromise, authUpdatePromise]);

      toast({
        title: 'Settings Updated',
        description: 'Your profile and settings have been saved.',
      });
      form.reset(data); // to update the form's dirty state
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: (error as Error).message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  const handleDataAction = (action: 'export' | 'delete') => {
      toast({
        title: `${action === 'export' ? 'Export' : 'Deletion'} Initiated`,
        description: `This is a placeholder. A real implementation would trigger a cloud function.`,
      });
  }

  if (isLoadingData) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-full max-w-sm" />
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-6 w-11 rounded-full" />
                    </div>
                     <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-6 w-11 rounded-full" />
                    </div>
                </div>
            </CardContent>
             <CardFooter>
                 <Skeleton className="h-10 w-32" />
            </CardFooter>
        </Card>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Profile Settings</CardTitle>
            <CardDescription>Manage your display name and application preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Narration &amp; Voice</h3>
                 <FormField
                    control={form.control}
                    name="narratorVolume"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Narrator Volume</FormLabel>
                             <FormControl>
                                <Slider
                                    defaultValue={[field.value * 100]}
                                    max={100}
                                    step={1}
                                    onValueChange={(value) => field.onChange(value[0] / 100)}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                    />
                 <FormField
                    control={form.control}
                    name="ttsVoice"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Narrator Voice</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a voice" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="warmCalm">Warm &amp; Calm</SelectItem>
                                    <SelectItem value="neutralAnalytical">Neutral &amp; Analytical</SelectItem>
                                    <SelectItem value="poeticSoft">Poetic &amp; Soft</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                    />
            </div>

             <div className="space-y-4">
                 <h3 className="text-lg font-medium">Email &amp; Notifications</h3>
                <FormField
                control={form.control}
                name="receiveWeeklyEmail"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel>Receive Weekly Digest Emails</FormLabel>
                            <FormDescription>
                                Get a weekly summary of your journey.
                            </FormDescription>
                        </div>
                         <FormControl>
                            <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            />
                        </FormControl>
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="receiveMilestones"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel>Receive Milestone Emails</FormLabel>
                            <FormDescription>
                                Get notified of significant moments and achievements.
                            </FormDescription>
                        </div>
                         <FormControl>
                            <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            />
                        </FormControl>
                    </FormItem>
                )}
                />
                 <FormField
                    control={form.control}
                    name="emailTone"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email Tone</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an email tone" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="poetic">Poetic</SelectItem>
                                    <SelectItem value="calm">Calm</SelectItem>
                                    <SelectItem value="analytical">Analytical</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                    />
            </div>

            <div className="space-y-4">
                 <h3 className="text-lg font-medium">Data Collection</h3>
                <FormField
                control={form.control}
                name="passiveAudioEnabled"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel>Enable Passive Audio Analysis</FormLabel>
                            <FormDescription>
                                Let the app analyze ambient sounds and conversations.
                            </FormDescription>
                        </div>
                         <FormControl>
                            <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            />
                        </FormControl>
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="faceEmotionEnabled"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel>Enable Facial Emotion Analysis</FormLabel>
                            <FormDescription>
                                Allow camera access to analyze facial expressions.
                            </FormDescription>
                        </div>
                         <FormControl>
                            <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            />
                        </FormControl>
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="gpsAllowed"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel>Enable Location Tracking</FormLabel>
                            <FormDescription>
                                Allow GPS access to track movement and location patterns.
                            </FormDescription>
                        </div>
                         <FormControl>
                            <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            />
                        </FormControl>
                    </FormItem>
                )}
                />
            </div>

             <div className="space-y-4">
                 <h3 className="text-lg font-medium">Privacy &amp; Data Sharing</h3>
                <FormField
                control={form.control}
                name="dataConsent.shareAnonymousData"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel>Share Anonymized Data</FormLabel>
                            <FormDescription>
                                Contribute anonymous patterns to help researchers.
                            </FormDescription>
                        </div>
                         <FormControl>
                            <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            />
                        </FormControl>
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="allowVoiceRetention"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel>Allow Voice Retention</FormLabel>
                            <FormDescription>
                               Keep voice clips to improve voiceprint accuracy.
                            </FormDescription>
                        </div>
                         <FormControl>
                            <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            />
                        </FormControl>
                    </FormItem>
                )}
                />
            </div>

          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </CardFooter>
        </Card>
      </form>
      
      <Separator className="my-8"/>
      
      <Card>
        <CardHeader>
            <CardTitle className="font-headline text-2xl">Data Management</CardTitle>
            <CardDescription>Export or delete your personal data.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="outline"><FileDown className="mr-2"/> Export My Data</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Data Export</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will start the process of exporting all your data. You will receive an email with a secure download link when it&apos;s ready. This may take some time.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDataAction('export')}>Confirm</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive"><Trash2 className="mr-2"/> Erase My Logs</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete all your data, including your profile, memories, and insights from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDataAction('delete')} className="bg-destructive hover:bg-destructive/90">Yes, delete everything</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </CardContent>
      </Card>
    </Form>
  );
}
