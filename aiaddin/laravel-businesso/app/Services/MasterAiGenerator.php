<?php

namespace App\Services;

use App\Http\Helpers\UserPermissionHelper;
use App\Jobs\RunServiceJob;
use App\Jobs\SendAiDoneMailJob;
use App\Services\AiWebsite\BasicSettingService;
use App\Services\AiWebsite\Blog\BlogCategoryService;
use App\Services\AiWebsite\Blog\BlogFeaturedImageService;
use App\Services\AiWebsite\Blog\BlogService;
use App\Services\AiWebsite\Blog\BlogSliderImageService;
use App\Services\AiWebsite\ContactService;
use App\Services\AiWebsite\CourseManagement\ActionSectionService;
use App\Services\AiWebsite\CourseManagement\CourseCategoryService;
use App\Services\AiWebsite\CourseManagement\CourseCouponService;
use App\Services\AiWebsite\CourseManagement\CourseService;
use App\Services\AiWebsite\CourseManagement\InstructorService;
use App\Services\AiWebsite\DonationManagement\DonationCategoryService;
use App\Services\AiWebsite\DonationManagement\DonationCauseService;
use App\Services\AiWebsite\FAQService;
use App\Services\AiWebsite\GalleryManagement\GalleryCategoryService;
use App\Services\AiWebsite\GalleryManagement\GalleryItemService;
use App\Services\AiWebsite\HomePage\BrandService;
use App\Services\AiWebsite\HomePage\CounterInformationService;
use App\Services\AiWebsite\HomePage\FooterQuickLinkService;
use App\Services\AiWebsite\HomePage\FooterTextService;
use App\Services\AiWebsite\HomePage\HeroSliderService;
use App\Services\AiWebsite\HomePage\HomePageTextService;
use App\Services\AiWebsite\HomePage\JobCategoryService;
use App\Services\AiWebsite\HomePage\JobService;
use App\Services\AiWebsite\HomePage\MemberService;
use App\Services\AiWebsite\HomePage\SkillService;
use App\Services\AiWebsite\HomePage\TestimonialService;
use App\Services\AiWebsite\HotelManagement\RoomAmenityService;
use App\Services\AiWebsite\HotelManagement\RoomCategoryService;
use App\Services\AiWebsite\HotelManagement\RoomCouponService;
use App\Services\AiWebsite\HotelManagement\RoomService;
use App\Services\AiWebsite\OfferBannerService;
use App\Services\AiWebsite\PortfolioCategoryService;
use App\Services\AiWebsite\PortfolioService;
use App\Services\AiWebsite\PortfolioSliderImageService;
use App\Services\AiWebsite\SEOService;
use App\Services\AiWebsite\ShopManagement\CouponService;
use App\Services\AiWebsite\ShopManagement\ItemCategoryService;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Http;
use App\Services\GeminiTokenService;
use App\Services\AiWebsite\ShopManagement\ItemService;
use App\Services\AiWebsite\ShopManagement\ItemSubCategoryService;
use App\Services\AiWebsite\ShopManagement\ShippingChargeService;
use App\Services\AiWebsite\SocialService;
use App\Services\AiWebsite\UserFeatureService;
use App\Services\AiWebsite\UserServiceService;
use App\Services\AiWebsite\WhyChooseUsItemService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Throwable;

class MasterAiGenerator
{
  protected $userId;
  protected $theme;
  protected $businessName;
  protected $industry;
  protected $businessInfo;
  protected $aiEngine;
  protected $pages = [];
  protected $defaultLanguageId;
  protected $isDeleteOldRecords;
  protected string $runId = '';

  public function __construct()
  {

  }

  public function getDefaultLanguageId()
  {
    if ($this->defaultLanguageId) {
      return $this->defaultLanguageId;
    }

    $this->defaultLanguageId = \App\Models\User\Language::where('user_id', $this->userId)
      ->where('is_default', 1)
      ->value('id');

    if (!$this->defaultLanguageId) {
      $this->defaultLanguageId = \App\Models\User\Language::where('user_id', $this->userId)
        ->value('id');
    }

    return $this->defaultLanguageId ?: 1;
  }

  public function generateFullWebsite(array $data)
  {
 
    $this->userId = (int) $data['user_id'];
    $this->theme  = $data['theme'] ?? '';
    $this->businessName = $data['business_name'] ?? '';
    $this->industry = $data['industry'] ?? '';
    $this->businessInfo = !empty($data['business_info'])
      ? $data['business_info']
      : "A professional {$this->industry} company offering high-quality services to clients worldwide.";

    $this->aiEngine = $data['ai_engine'];
    $this->pages = is_array($data['pages'] ?? null) ? $data['pages'] : [];

    $this->isDeleteOldRecords = ($data['delete_old_records'] === true
      || $data['delete_old_records'] === 1
      || $data['delete_old_records'] === '1');

    $this->generateWithThrottling();

    return "AI Website Generated Successfully for {$this->businessName}";
  }

  private function payload(): array
  {
    return [
      'user_id'        => $this->getUserId(),
      'theme'          => $this->theme,
      'business_name'  => $this->businessName,
      'industry'       => $this->industry,
      'business_info'  => $this->businessInfo,
      'pages'          => $this->pages,
      'ai_engine'      => $this->aiEngine,
      'is_delete_old_records'      => $this->isDeleteOldRecords,
      'run_id' => $this->runId,
    ];
  }


  public function setContext(array $data): void
  {
    $this->userId = (int) ($data['user_id'] ?? 0);
    $this->theme = (string) ($data['theme'] ?? '');
    $this->businessName = (string) ($data['business_name'] ?? '');
    $this->industry = (string) ($data['industry'] ?? '');
    $this->businessInfo = (string) ($data['business_info'] ?? '');
    $this->pages = is_array($data['pages'] ?? null) ? $data['pages'] : [];
    $this->aiEngine = (string) ($data['ai_engine'] ?? 'pollinations');
    $this->isDeleteOldRecords = $data['is_delete_old_records'];
    $this->runId = (string) ($data['run_id'] ?? '');
  }


  private function generateWithThrottling()
  {
    $delay = 0;

    $runId = (string) Str::uuid();
    $this->runId = $runId;

    // prevent same user parallel run
    // $lock = Cache::lock("ai_generate_lock:user:{$this->userId}", 600);
    // if (!$lock->get()) {
    //   \Log::warning("AI generation already running for user {$this->userId}");
    //   return;
    // }

    // try {

    $jobs = [];

    // ====================== COMMON FOR ALL THEMES ======================
    $commonServices = [
      HeroSliderService::class,
      CounterInformationService::class,
      FooterTextService::class,
      FooterQuickLinkService::class,
      BasicSettingService::class,
      SocialService::class,
      SEOService::class,
    ];

    foreach ($commonServices as $service) {
      $jobs[] = $service;

      dispatch(new RunServiceJob($service, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;
    }

    // Home Page Text
    if (in_array('home', $this->pages)) {
      $jobs[] = HomePageTextService::class;

      dispatch(new RunServiceJob(HomePageTextService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;
    }

    // ====================== PAGE-BASED SERVICES ======================

    if (in_array('services', $this->pages)) {
      $jobs[] = UserServiceService::class;

      dispatch(new RunServiceJob(UserServiceService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;
    }

    if (in_array('faq', $this->pages)) {
      $jobs[] = FAQService::class;

      dispatch(new RunServiceJob(FAQService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;
    }

    if (in_array('team', $this->pages)) {
      $jobs[] = MemberService::class;

      dispatch(new RunServiceJob(MemberService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;
    }

    if (in_array('career', $this->pages)) {
      $jobs[] = JobCategoryService::class;

      dispatch(new RunServiceJob(JobCategoryService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;

      $jobs[] = JobService::class;

      dispatch(new RunServiceJob(JobService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;
    }

    if (in_array('portfolios', $this->pages)) {
      $jobs[] = PortfolioCategoryService::class;

      dispatch(new RunServiceJob(PortfolioCategoryService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;

      $jobs[] = PortfolioService::class;

      dispatch(new RunServiceJob(PortfolioService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;

      $jobs[] = PortfolioSliderImageService::class;

      dispatch(new RunServiceJob(PortfolioSliderImageService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;
    }

    if (in_array('blog', $this->pages)) {
      $jobs[] = BlogCategoryService::class;

      dispatch(new RunServiceJob(BlogCategoryService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;

      $jobs[] = BlogService::class;

      dispatch(new RunServiceJob(BlogService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;

      $jobs[] = BlogSliderImageService::class;

      dispatch(new RunServiceJob(BlogSliderImageService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;

      $jobs[] = BlogFeaturedImageService::class;

      dispatch(new RunServiceJob(BlogFeaturedImageService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;
    }

    if (in_array('shop', $this->pages)) {
      $jobs[] = ShippingChargeService::class;

      dispatch(new RunServiceJob(ShippingChargeService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;

      $jobs[] = CouponService::class;

      dispatch(new RunServiceJob(CouponService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;

      $jobs[] = ItemCategoryService::class;

      dispatch(new RunServiceJob(ItemCategoryService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;

      $jobs[] = ItemSubCategoryService::class;

      dispatch(new RunServiceJob(ItemSubCategoryService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;

      $jobs[] = ItemService::class;

      dispatch(new RunServiceJob(ItemService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;
    }

    if (in_array('contact', $this->pages)) {
      $jobs[] = ContactService::class;

      dispatch(new RunServiceJob(ContactService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;
    }

    if (in_array('gallery', $this->pages)) {
      $jobs[] = GalleryCategoryService::class;

      dispatch(new RunServiceJob(GalleryCategoryService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;

      $jobs[] = GalleryItemService::class;

      dispatch(new RunServiceJob(GalleryItemService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;
    }

    // ====================== THEME-SPECIFIC SERVICES ======================

    // Brand
    $brandExcluded = ['home_four', 'home_five', 'home_seven', 'home_ten', 'home_eleven', 'home_thirteen', 'home_fourteen'];
    if (!in_array($this->theme, $brandExcluded)) {
      $jobs[] = BrandService::class;

      dispatch(new RunServiceJob(BrandService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;
    }

    // Skill
    if (in_array($this->theme, ['home_one', 'home_four', 'home_five', 'home_six', 'home_tweleve', 'home_thirteen'])) {
      $jobs[] = SkillService::class;

      dispatch(new RunServiceJob(SkillService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;
    }

    // Testimonial
    if (!in_array($this->theme, ['home_eight', 'home_fourteen'])) {
      $jobs[] = TestimonialService::class;

      dispatch(new RunServiceJob(TestimonialService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;
    }

    // Why Choose Us
    if (in_array($this->theme, ['home_one', 'home_nine'])) {
      $jobs[] = WhyChooseUsItemService::class;

      dispatch(new RunServiceJob(WhyChooseUsItemService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;
    }

    // Offer Banner
    if (in_array($this->theme, ['home_eight', 'home_fourteen'])) {
      $jobs[] = OfferBannerService::class;

      dispatch(new RunServiceJob(OfferBannerService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;
    }

    // User Features
    if (in_array($this->theme, ['home_eight', 'home_ten', 'home_eleven', 'home_fourteen'])) {
      $jobs[] = UserFeatureService::class;

      dispatch(new RunServiceJob(UserFeatureService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;
    }

    // Hotel (home_nine + rooms page)
    if ($this->theme === 'home_nine' && in_array('rooms', $this->pages)) {
      $jobs[] = RoomCouponService::class;

      dispatch(new RunServiceJob(RoomCouponService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;

      $jobs[] = RoomAmenityService::class;

      dispatch(new RunServiceJob(RoomAmenityService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;

      $jobs[] = RoomCategoryService::class;

      dispatch(new RunServiceJob(RoomCategoryService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;

      $jobs[] = RoomService::class;

      dispatch(new RunServiceJob(RoomService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;
    }

    // Course (home_ten + courses page)
    if ($this->theme === 'home_ten' && in_array('courses', $this->pages)) {
      $jobs[] = ActionSectionService::class;

      dispatch(new RunServiceJob(ActionSectionService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;

      $jobs[] = InstructorService::class;

      dispatch(new RunServiceJob(InstructorService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;

      $jobs[] = CourseCategoryService::class;

      dispatch(new RunServiceJob(CourseCategoryService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;

      $jobs[] = CourseService::class;

      dispatch(new RunServiceJob(CourseService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;

      $jobs[] = CourseCouponService::class;

      dispatch(new RunServiceJob(CourseCouponService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;
    }

    // Donation (home_eleven + causes page)
    if ($this->theme === 'home_eleven' && in_array('causes', $this->pages)) {
      $jobs[] = DonationCategoryService::class;

      dispatch(new RunServiceJob(DonationCategoryService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;

      $jobs[] = DonationCauseService::class;

      dispatch(new RunServiceJob(DonationCauseService::class, $this->payload()))
        ->onQueue('ai')
        ->delay(now()->addSeconds($delay));

      $delay += 5;
    }

    // ====================== INIT COUNTERS ======================
    $totalJobs = count($jobs);

    Cache::put("ai_run_expected:{$runId}", $totalJobs, now()->addHours(2));
    Cache::put("ai_run_completed:{$runId}", 0, now()->addHours(2));
  }

  // Helper methods — Service 
  public function getUserId()
  {
    return $this->userId;
  }
  public function getTheme()
  {
    return $this->theme;
  }
  public function getBusinessName()
  {
    return $this->businessName;
  }
  public function getIndustry()
  {
    return $this->industry;
  }
  public function getBusinessInfo()
  {
    return $this->businessInfo;
  }
  public function getAiEngine()
  {
    return $this->aiEngine;
  }
  public function getPages()
  {
    return $this->pages;
  }

  public function getThemeName()
  {
    return $this->config[$this->theme]['name'] ?? ucwords(str_replace('_', ' ', $this->theme));
  }
  public function isDeleteOldRecords()
  {
    return $this->isDeleteOldRecords ?? false;
  }

  // ====== ai config helper function ======

  private function configAll(): array
  {
    return \App\Services\AiProviderConfig::get();
  }

  // fetch specific ai engine information
  private function engineConfig(): array
  {
    $cfg = $this->configAll();
    return $cfg[$this->aiEngine] ?? [];
  }

  private function canGenerateText(): bool
  {
    $ct = strtolower((string) ($this->engineConfig()['content_type'] ?? 'all'));
    return in_array($ct, ['all', 'text'], true);
  }

  private function canGenerateImage(): bool
  {
    $ct = strtolower((string) ($this->engineConfig()['content_type'] ?? 'all'));
    return in_array($ct, ['all', 'image'], true);
  }

  // Text Generation 
  public function generateText($prompt)
  {
    if (!$this->canGenerateText()) {
      return '';
    }

    if ($this->aiEngine === 'gemini') {

      return $this->geminiText($prompt);
    } elseif ($this->aiEngine === 'pollinations') {
      return $this->pollinationsText($prompt);
    } elseif ($this->aiEngine === 'openai') {
      return $this->openAiText($prompt);
    }
    return '';
  }

  // Image Generation 
  public function generateImage($prompt, $width = 1920, $height = 925, $customPath = null)
  {
    if (!$this->canGenerateImage()) {
      return 'default.jpg';
    }

    if ($this->aiEngine === 'gemini') {
      $result = $this->geminiImage($prompt, $width, $height, $customPath);
      return $result;
    } elseif ($this->aiEngine === 'pollinations') {
      $result = $this->pollinationsImage($prompt, $width, $height, $customPath);
      return $result;
    } elseif ($this->aiEngine === 'openai') {
      $result = $this->openAiImage($prompt, $width, $height, $customPath);
      return $result;
    }
    return 'default.jpg';
  }

  // Google Gemini Text Generation
  private function geminiText($prompt)
  {

    if (!$this->canGenerateText()) return '';

    $cfg = $this->configAll()['gemini'] ?? [];
    $apiKey = (string) ($cfg['api_key'] ?? env('GEMINI_API_KEY'));
    $model  = (string) ($cfg['text_model'] ?? 'gemini-2.0-flash');

    if (empty($apiKey)) return '';

    $finalPrompt = $this->buildPromptWithLanguage($prompt);

    try {
      $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent";

      $response = Http::timeout(60)
        ->withHeaders(['x-goog-api-key' => $apiKey])
        ->post($endpoint, [
          'contents' => [
            ['parts' => [['text' => $finalPrompt]]]
          ]
        ]);

      if ($response->successful()) {
        $data = $response->json();

        $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? null;
        return $text ? trim($text) : '';
      }
    } catch (\Exception $e) {
      return "";
    }
    return '';
  }


  // Pollinations Text Generation
  private function pollinationsText($prompt)
  {

    try {

      $finalPrompt = $this->buildPromptWithLanguage($prompt);

      $url = "https://text.pollinations.ai/" . urlencode($finalPrompt);

      $response = Http::timeout(180)
        ->connectTimeout(30)
        ->retry(3, 5000)
        ->get($url);

      if ($response->successful()) {
        return trim($response->body());
      }
    } catch (\Exception $e) {
      return "Pollinations Error: " . $prompt;
    }
    return '';
  }

  private function openAiText(string $prompt): string
  {
    if (!$this->canGenerateText()) return '';

    $cfg = $this->configAll()['openai'] ?? [];
    $apiKey = (string) ($cfg['api_key'] ?? env('OPENAI_API_KEY'));
    $model  = (string) ($cfg['text_model'] ?? 'gpt-4o');

    if (empty($apiKey)) return '';

    $finalPrompt = $this->buildPromptWithLanguage($prompt);

    try {
      $response = Http::withHeaders([
        'Authorization' => 'Bearer ' . $apiKey,
        'Content-Type'  => 'application/json',
      ])->timeout(60)->post('https://api.openai.com/v1/chat/completions', [
        'model' => $model,
        'messages' => [
          ['role' => 'user', 'content' => $finalPrompt],
        ],
        'temperature' => 0.7,
      ]);

      if ($response->successful()) {
        return (string) ($response->json()['choices'][0]['message']['content'] ?? '');
      }

      return '';
    } catch (\Throwable $e) {

      return '';
    }
  }

  // Gemini Image Generation 

  private function geminiImage($prompt, $width, $height, $path)
  {
    try {
      if (!$this->canGenerateImage()) {
        return 'default.jpg';
      }

      $cfg = \App\Services\AiProviderConfig::get()['gemini'] ?? [];


      if (empty($apiKey)) {
        return 'default.jpg';
      }

      //  Correct endpoint for Imagen REST

      $apiKey = trim((string) ($cfg['api_key'] ?? env('GEMINI_API_KEY')));
      $model  = (string) ($cfg['image_model'] ?? 'imagen-4.0-generat-001'); 

      $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:predict?key=" . $apiKey;

      $aspectRatio = $this->aspectRatioFromSize($width, $height);

      $response = Http::timeout(180)
        ->withHeaders(['Content-Type' => 'application/json'])
        ->post($endpoint, [
          "instances" => [
            ["prompt" => $prompt]
          ],
          "parameters" => [
            "sampleCount" => 1,
            "aspectRatio" => $aspectRatio,
          ]
        ]);

      if (!$response->successful()) {

        return 'default.jpg';
      }

      $json = $response->json();

      $base64 = $json['predictions'][0]['bytesBase64Encoded'] ?? null;

      if (!$base64) {
        return 'default.jpg';
      }

      $imageBinary = base64_decode($base64);
      if ($imageBinary === false) {
        return 'default.jpg';
      }

      $fullPath = public_path($path);

      if (!file_exists($fullPath)) {
        mkdir($fullPath, 0775, true);
      }

      $filename = 'ai_' . time() . '_' . \Illuminate\Support\Str::random(8) . '.jpg';

      $result = file_put_contents($fullPath . $filename, $imageBinary);
      if ($result === false) {
        return 'default.jpg';
      }

      return $filename;
    } catch (\Exception $e) {
      \Log::error('Gemini Image Generation Error: ' . $e->getMessage());
      return 'default.jpg';
    }
  }


  private function pollinationsImage($prompt, $width, $height, $path)
  {
    try {
      $enhancedPrompt = $prompt;
      $encoded = urlencode($enhancedPrompt);

      $url = "https://image.pollinations.ai/prompt/{$encoded}?" . http_build_query([
        'width' => $width,
        'height' => $height,
        'model' => 'NanoBanana',
        'enhance' => 'true',
        'nologo' => 'true',
        'private' => 'false',
        'seed' => rand(1000, 9999),
      ]);

      $response = Http::timeout(180)
        ->connectTimeout(30)
        ->retry(3, 5000)
        ->get($url);

      if ($response->successful()) {
        $fullPath = public_path($path);

        // Ensure directory exists
        if (!file_exists($fullPath)) {
          mkdir($fullPath, 0775, true);
        }

        $filename = 'ai_' . time() . '_' . Str::random(8) . '.jpg';

        // Delete old file if exists
        if (file_exists($fullPath . $filename)) {
          @unlink($fullPath . $filename);
        }

        // Save the file
        $result = file_put_contents($fullPath . $filename, $response->body());

        if ($result === false) {

          return 'default.jpg';
        }
        return $filename;
      }
      return 'default.jpg';
    } catch (\Exception $e) {

      return 'default.jpg';
    }
  }

  public function openAiImage($prompt, $width, $height, $path)
  {

    if (!$this->canGenerateImage()) return 'default.jpg';

    $cfg = $this->configAll()['openai'] ?? [];
    $apiKey = (string) ($cfg['api_key'] ?? '');
    $model  = (string) ($cfg['image_model'] ?? 'dall-e-3');

    if (empty($apiKey)) return 'default.jpg';

    try {

      $size = $this->getNearestOpenAiSize($width, $height);

      $response = Http::withHeaders([
        'Authorization' => 'Bearer ' . $apiKey,
        'Content-Type' => 'application/json',
      ])->timeout(180)
        ->post('https://api.openai.com/v1/images/generations', [
          'model' => $model,
          'prompt' => $prompt,
          'n' => 1,
          'size' => $size,

        ]);

      if ($response->successful()) {

        $imageUrl = $response->json()['data'][0]['url'];

        $imageResponse = Http::timeout(60)->get($imageUrl);

        if ($imageResponse->successful()) {
          $fullPath = public_path($path);

          if (!file_exists($fullPath)) {
            mkdir($fullPath, 0775, true);
          }

          $filename = 'ai_' . time() . '_' . \Illuminate\Support\Str::random(8) . '.jpg';

          $saved = file_put_contents($fullPath . '/' . $filename, $imageResponse->body());

          if ($saved !== false) {
            return $filename;
          }
        }
        return 'default.jpg';
      }
      return 'default.jpg';
    } catch (\Exception $e) {
      \Log::error('OpenAI Image Error: ' . $e->getMessage());
      return 'default.jpg';
    }
  }

  // Helper function nearest size select for open ai
  private function getNearestOpenAiSize($width, $height)
  {
    // Aspect ratio calculate
    if ($height == 0) $height = 1;
    $ratio = $width / $height;

    $options = [
      '1024x1024' => 1.0,
      '1536x1024' => 1.5,
      '1024x1536' => 0.6667,
    ];

    $best = '1024x1024';
    $minDiff = PHP_INT_MAX;

    foreach ($options as $size => $optRatio) {
      $diff = abs($ratio - $optRatio);
      if ($diff < $minDiff) {
        $minDiff = $diff;
        $best = $size;
      }
    }

    return $best;
  }

  private function buildPromptWithLanguage(string $prompt): string
  {
    $language = \App\Models\User\Language::where([
      ['user_id', $this->userId],
      ['is_default', 1],
    ])->first();

    $languageName = $language?->name ?? 'English';
    $forceInstruction = "Reply only in {$languageName}, do not use English or any other language: ";

    $finalPrompt = $forceInstruction . $prompt;

    return $finalPrompt;
  }

  //aspectratio generate for gemini
  private function aspectRatioFromSize($width, $height)
  {
    if (!$width || !$height) return '1:1';

    $ratio = $width / $height;

    if (abs($ratio - 1) < 0.1) return '1:1';
    if ($ratio > 1.7) return '16:9';
    if ($ratio > 1.2) return '4:3';
    if ($ratio < 0.6) return '9:16';

    return '3:4';
  }   
  
}
