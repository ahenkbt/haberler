<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Services\MasterAiGenerator;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class GenerateFullWebsiteJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 600; // 10 মিনিট

    protected $userId;
    protected $theme;
    protected $businessName;
    protected $industry;
    protected $businessInfo;
    protected $pages;
    protected $userEmail;
    protected $userName;

    public function __construct(
        $userId,
        $theme,
        $businessName,
        $industry,
        $businessInfo = '',
        $pages = []
    ) {
        $this->userId = $userId;
        $this->theme = $theme;
        $this->businessName = $businessName;
        $this->industry = $industry;
        $this->businessInfo = $businessInfo;
        $this->pages = $pages;

        // ইউজারের ইমেইল ও নাম সেট করুন
        $user = User::find($userId);
        if ($user) {
            $this->userEmail = $user->email;
            $this->userName = $user->name;
        }
    }

    public function handle()
    {
        Log::info('Starting AI website generation job', [
            'user_id' => $this->userId,
            'business' => $this->businessName
        ]);

        try {
            $aiService = new MasterAiGenerator();

            // আপনার মূল জেনারেশন লজিক কল করুন
            $result = $aiService->generateFullWebsite(
                $this->userId,
                $this->theme,
                $this->businessName,
                $this->industry,
                $this->businessInfo,
                $this->pages
            );

            Log::info('AI website generation completed', [
                'user_id' => $this->userId,
                'result' => $result
            ]);

            // ✅ সাকসেস মেইল পাঠান
            $this->sendSuccessEmail();
        } catch (\Exception $e) {
            Log::error('AI website generation failed', [
                'user_id' => $this->userId,
                'error' => $e->getMessage()
            ]);

            // ✅ এরর মেইল পাঠান
            $this->sendErrorEmail($e->getMessage());

            throw $e;
        }
    }

    public function failed(\Throwable $exception)
    {
        Log::critical('AI website generation job failed after all retries', [
            'user_id' => $this->userId,
            'error' => $exception->getMessage()
        ]);

        // ✅ সব রিট্রাই ফেইল হলে মেইল
        $this->sendFailedEmail($exception->getMessage());
    }

    private function sendSuccessEmail()
    {
        if (!$this->userEmail) return;

        $data = [
            'userName' => $this->userName,
            'businessName' => $this->businessName,
            'theme' => $this->theme,
            'generatedTime' => now()->format('F j, Y, g:i a')
        ];

        Mail::send('emails.website_generated', $data, function ($message) {
            $message->to($this->userEmail)
                ->subject('✅ Your Website Has Been Generated Successfully!');
        });
    }

    private function sendErrorEmail($errorMessage)
    {
        if (!$this->userEmail) return;

        $data = [
            'userName' => $this->userName,
            'businessName' => $this->businessName,
            'errorMessage' => $errorMessage,
            'time' => now()->format('F j, Y, g:i a')
        ];

        Mail::send('emails.website_generation_error', $data, function ($message) {
            $message->to($this->userEmail)
                ->subject('⚠️ Website Generation Failed');
        });
    }

    private function sendFailedEmail($errorMessage)
    {
        if (!$this->userEmail) return;

        $data = [
            'userName' => $this->userName,
            'businessName' => $this->businessName,
            'errorMessage' => $errorMessage,
            'time' => now()->format('F j, Y, g:i a')
        ];

        Mail::send('emails.website_generation_failed', $data, function ($message) {
            $message->to($this->userEmail)
                ->subject('❌ Website Generation Failed After Multiple Attempts');
        });
    }
}
