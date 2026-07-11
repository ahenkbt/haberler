<?php

namespace App\Jobs;

use App\Services\MasterAiGenerator;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class RunServiceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected string $serviceClass;
    protected array $data;

    public function __construct(string $serviceClass, array $data)
    {
        $this->serviceClass = $serviceClass;
        $this->data = $data;
    }

    public function handle()
    {

        if (empty($this->data['user_id'])) {
            return;
        }

        $contextData = [
            'user_id' => $this->data['user_id'] ?? null,
            'theme' => $this->data['theme'] ?? '',
            'business_name' => $this->data['business_name'] ?? '',
            'industry' => $this->data['industry'] ?? '',
            'business_info' => $this->data['business_info'] ?? '',
            'pages' => $this->data['pages'] ?? [],
            'ai_engine' => $this->data['ai_engine'] ?? 'pollinations',
            'is_delete_old_records' => $this->data['is_delete_old_records'] ?? true,
            'run_id' => $this->data['run_id'] ?? null,
        ];

        $ai = new MasterAiGenerator();
        $ai->setContext($contextData);

        // class exists check
        if (!class_exists($this->serviceClass)) {
            return;
        }

        $service = new $this->serviceClass($ai);

        $service->generate();

        // ================== COMPLETE TRACK ==================
        $runId = $this->data['run_id'] ?? null;
        if (!$runId) return;

        $completed = Cache::increment("ai_run_completed:{$runId}");
        $expected  = (int) Cache::get("ai_run_expected:{$runId}", 0);

        // last job check + prevent duplicate mail
        if ($expected > 0 && $completed >= $expected) {

            // only one worker will win this
            if (Cache::add("ai_run_mail_lock:{$runId}", 1, now()->addMinutes(30))) {

                try {
                    $userId = (int) ($this->data['user_id']);
                    $theme  = (string) ($this->data['theme']);

                    $user = \App\Models\User::find($userId);
                    if (!$user) {
                        return;
                    }

                    if (session()->has('lang')) {
                        $currentLang = \App\Models\Language::where('code', session()->get('lang'))->first();
                    } else {
                        $currentLang = \App\Models\Language::where('is_default', 1)->first();
                    }

                    $bs = $currentLang?->basic_setting;

                    $websiteTitle = $bs->website_title ?? __('Website');
                    $subject = $websiteTitle . ' - ' . __('AI Generation Completed');

                    $body = " <p>" . __('Hello') . " {$user->fname},</p> 
                    <p>" . __('Your AI website generation has completed successfully') . '.' . "</p> <p><b>" . __('Theme') . ":</b> {$theme}</p> 
                    <p>" . __('You can now review your website') . '.' . "</p> 
                    <p>" . __('Thanks') . ",<br>{$websiteTitle}</p> ";

                    $mailer = new \App\Http\Helpers\MegaMailer();
                    $mailer->mailSimpleFromAdmin([
                        'toMail' => $user->email,
                        'toName' => $user->fname,
                        'subject' => $subject,
                        'body' => $body,
                    ]);

                    //cleanup
                    Cache::forget("ai_run_expected:{$runId}");
                    Cache::forget("ai_run_completed:{$runId}");
                    Cache::forget("ai_run_mail_lock:{$runId}");
                } catch (\Throwable $e) {

                     Cache::forget("ai_run_mail_lock:{$runId}");
                }
            }
        }
    }

    public function failed(\Throwable $e)
    {
        Log::error('RunServiceJob failed', [
            'service' => $this->serviceClass,
            'error'   => $e->getMessage(),
        ]);
    }
}
