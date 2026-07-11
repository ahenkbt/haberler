<?php

namespace App\Services\AiWebsite;

use App\Models\User\UserService;
use App\Services\MasterAiGenerator;
use Illuminate\Support\Str;

class UserServiceService
{
  protected $ai;
  protected $imageStoragePath = 'assets/front/img/user/services/';
  protected $isDeleteOldRecords;

  public function __construct(MasterAiGenerator $ai)
  {
    $this->ai = $ai;
    $this->isDeleteOldRecords = $this->ai->isDeleteOldRecords();
  }

  public function generate()
  {
    if ($this->isDeleteOldRecords) {
      $userId = $this->ai->getUserId();
      $oldServices = UserService::where('user_id', $userId)->get();

      foreach ($oldServices as $service) {
        if ($service->image && file_exists(public_path($this->imageStoragePath . $service->image))) {
          @unlink(public_path($this->imageStoragePath . $service->image));
        }
      }

      UserService::where('user_id', $userId)->delete();
    }

    $theme = $this->ai->getTheme();

    $businessName = $this->ai->getBusinessName();
    $industry = $this->ai->getIndustry();
    $businessInfo = $this->ai->getBusinessInfo();

    $baseContext = "{$businessName} is a business in {$industry}. {$businessInfo}";

    $serviceData = $this->getServiceData($theme, $baseContext);

    foreach ($serviceData as $index => $data) {

      // Title first
      $cleanName = $this->generateValidServiceTitle(
        $data['name_prompt'],
        $data['fallback_name'] ?? 'Professional Services'
      );

      // Build prompts with title
      $contentPrompt = $this->buildContentPromptByTheme($theme, $cleanName, $baseContext);
      $metaPrompt    = $this->buildMetaPromptByTheme($theme, $cleanName, $baseContext);

      // Generate content/meta with retry if mismatch
      $content = $this->generateContentWithGuard($contentPrompt, $cleanName);
      $metaDescription = $this->ai->generateText($metaPrompt);

      $serviceInput = [
        'user_id' => $this->ai->getUserId(),
        'lang_id' => $this->ai->getDefaultLanguageId(),
        'name' => $cleanName,
        'slug' => Str::slug($cleanName) . '-' . time() . '-' . rand(100, 999),
        'content' => $this->extractCleanText($content),
        'serial_number' => $index + 1,
        'featured' => $data['featured'] ?? 0,
        'detail_page' => 1,
        'meta_keywords' => $cleanName . ', ' . $industry . ', ' . $businessName,
        'meta_description' => $this->extractCleanText($metaDescription),
      ];

      if (in_array($theme, ['home_seven', 'home_nine'])) {
        $iconPrompt = "You are an expert in Font Awesome icons.
          Based ONLY on this service name: \"{$cleanName}\"
          Return strictly ONE most relevant Font Awesome 6 icon class.
          Rules:
          - Output format: fas fa-home / far fa-gem etc.
          - Use 'fas' by default.
          - No quotes, no extra text.
          Now return the best icon for: \"{$cleanName}\"";

        $generatedIcon = $this->ai->generateText($iconPrompt);
        $serviceInput['icon'] = $this->extractCleanIcon($generatedIcon);
      }

      $imagePrompt = $this->buildImagePromptByTheme($theme, $cleanName);

      $image = $this->ai->generateImage(
        $imagePrompt,
        101,
        101,
        $this->imageStoragePath
      );

      $serviceInput['image'] = $image;

      UserService::create($serviceInput);
    }
  }

  private function getServiceData(string $theme, string $baseContext): array
  {
    $businessName = $this->ai->getBusinessName();

    $itMarketingThemes = ['home_one', 'home_two', 'home_three', 'home_four', 'home_six', 'home_twelve'];
    $isITMarketing = in_array($theme, $itMarketingThemes);
    $isHotel = ($theme === 'home_nine');
    $isNGO = ($theme === 'home_eleven');

    $nameGuardRules = "Return ONLY 2-6 words and ONLY a SERVICE/OFFERING name (noun phrase).
      DO NOT use the business name '{$businessName}'.
      DO NOT use brand-like words (studio, agency, momentum, creative, media, pulse, pixel).
      DO NOT write slogans. Must be a service people can buy.";

    if ($isITMarketing) {
      return [
        [
          'name_prompt' => "{$nameGuardRules}
          Generate an IT/Web + Digital Marketing primary service.
          Examples: Website Design & Development, Digital Marketing Strategy, Lead Generation, Conversion Optimization.
          Context: {$baseContext}",
          'fallback_name' => 'Website Design & Development',
          'featured' => 1,
        ],
        [
          'name_prompt' => "{$nameGuardRules}
          Generate a paid social advertising service.
          Examples: Social Media Ads, Facebook & Instagram Ads, TikTok Ads Campaigns, LinkedIn Lead Ads.
          Context: {$baseContext}",
          'fallback_name' => 'Social Media Ads',
          'featured' => 1,
        ],
        [
          'name_prompt' => "{$nameGuardRules}
          Generate a Google ads / PPC service.
          Examples: Google Ads Management, PPC Campaign Optimization, Search Ads Strategy.
          Context: {$baseContext}",
          'fallback_name' => 'Google Ads Management',
          'featured' => 1,
        ],
      ];
    }

    if ($isHotel) {
      return [
        [
          'name_prompt' => "{$nameGuardRules}
          Generate a hotel core service.
          Examples: Room Reservations, Suite Accommodation, Luxury Room Booking.
          Context: {$baseContext}",
          'fallback_name' => 'Room Reservations',
          'featured' => 1,
        ],
        [
          'name_prompt' => "{$nameGuardRules}
          Generate a dining service.
          Examples: Restaurant Dining, In-Room Dining, Catering Services.
          Context: {$baseContext}",
          'fallback_name' => 'Restaurant Dining',
          'featured' => 1,
        ],
        [
          'name_prompt' => "{$nameGuardRules}
          Generate events/banquet service.
          Examples: Event Hosting, Wedding Services, Conference Hall Booking.
          Context: {$baseContext}",
          'fallback_name' => 'Event Hosting',
          'featured' => 1,
        ],

      ];
    }

    if ($isNGO) {
      return [
        [
          'name_prompt' => "{$nameGuardRules}
          Generate an NGO core program/service.
          Examples: Community Relief, Food Distribution, Emergency Support.
          Context: {$baseContext}",
          'fallback_name' => 'Community Relief',
          'featured' => 1,
        ],
        [
          'name_prompt' => "{$nameGuardRules}
          Generate donation/fundraising service.
          Examples: Donation Management, Fundraising Campaigns, Donor Engagement.
          Context: {$baseContext}",
          'fallback_name' => 'Donation Management',
          'featured' => 1,
        ],
        [
          'name_prompt' => "{$nameGuardRules}
          Generate education/skills service.
          Examples: Skills Training, Education Support, Youth Development.
          Context: {$baseContext}",
          'fallback_name' => 'Education Support',
          'featured' => 1,
        ],
      ];
    }

    return [
      [
        'name_prompt' => "{$nameGuardRules}
        Generate a primary service relevant to the business.
        Examples: Professional Consulting, Customer Support.
        Context: {$baseContext}",
        'fallback_name' => 'Professional Consulting',
        'featured' => 1,
      ],
      [
        'name_prompt' => "{$nameGuardRules}
        Generate a secondary service relevant to the business.
        Examples: Strategy & Planning, Project Support.
        Context: {$baseContext}",
        'fallback_name' => 'Strategy & Planning',
        'featured' => 1,
      ],
    ];
  }

  private function buildContentPromptByTheme(string $theme, string $serviceName, string $baseContext): string
  {
    $guard = "Rules:
        - Must mention the exact service name \"{$serviceName}\" in the FIRST sentence.
        - Write ONLY about this service.
        - No bullet lists. No headings. No quotes.";

    if ($theme === 'home_nine') {
      return "Return EXACTLY 120-150 words. Hotel service description for: {$serviceName}.
      Mention guest experience, quality standards, and the service process.
      {$guard}
      Context: {$baseContext}";
    }

    if ($theme === 'home_eleven') {
      return "Return EXACTLY 120-150 words. Charity/NGO service description for: {$serviceName}.
      Mention beneficiaries, transparency, implementation process, and impact.
      {$guard}
      Context: {$baseContext}";
    }

    return "Return EXACTLY 120-150 words. Professional service description for: {$serviceName}.
    Include benefits, process steps, and measurable outcomes/ROI where relevant.
    {$guard}
    Context: {$baseContext}";
  }

  private function buildMetaPromptByTheme(string $theme, string $serviceName, string $baseContext): string
  {
    return "Return exactly 140-155 characters. SEO meta description ONLY for the service: {$serviceName}. No quotes. No extra text.
    Context: {$baseContext}";
  }

  private function buildImagePromptByTheme(string $theme, string $serviceName): string
  {
    if ($theme === 'home_nine') {
      return "Simple flat line icon for '{$serviceName}', hotel & hospitality style,
      minimalist clean 2D vector, full canvas fill, no shadows, no gradients, professional UI icon";
    }

    if ($theme === 'home_eleven') {
      return "Simple flat line icon for '{$serviceName}', charity & community support style,
      minimalist clean 2D vector, full canvas fill, no shadows, no gradients, professional UI icon";
    }

    return "Simple flat line icon for '{$serviceName}', minimalist clean 2D vector,
    full canvas fill, no shadows, no gradients, professional UI icon";
  }

  private function generateContentWithGuard(string $prompt, string $serviceName): string
  {
    for ($i = 0; $i < 3; $i++) {
      $text = $this->ai->generateText($prompt);
      $clean = $this->extractCleanText($text);

      // Ensure service name appears 
      if (stripos($clean, $serviceName) !== false) {
        return $text;
      }
    }

    return $this->ai->generateText($prompt);
  }

  private function generateValidServiceTitle(string $namePrompt, string $fallback): string
  {
    for ($try = 0; $try < 4; $try++) {
      $name = $this->ai->generateText($namePrompt);
      $cleanName = $this->extractCleanTitle($name);

      if (!$this->isInvalidServiceTitle($cleanName)) {
        return $cleanName;
      }
    }
    return $fallback;
  }

  private function isInvalidServiceTitle(string $title): bool
  {
    $t = strtolower(trim($title));
    if ($t === '') return true;

    $businessName = strtolower(trim($this->ai->getBusinessName() ?? ''));
    if ($businessName && str_contains($t, $businessName)) return true;

    $blacklist = ['studio', 'agency', 'momentum', 'creative', 'media', 'pulse', 'pixel', 'slogan'];
    foreach ($blacklist as $bad) {
      if (str_contains($t, $bad)) return true;
    }
    
    if (str_word_count($t) < 2) return true;

    // if ends with common service nouns, accept even if keyword missing
    $allowEndings = [
      'services',
      'service',
      'management',
      'ads',
      'advertising',
      'development',
      'design',
      'seo',
      'optimization',
      'analytics',
      'strategy',
      'campaigns',
      'support',
      'booking',
      'dining',
      'events',
      'training',
      'care',
      'program',
      'relief',
      'reservations'
    ];

    foreach ($allowEndings as $end) {
      if (preg_match('/\b' . preg_quote($end, '/') . '\b/', $t)) {
        return false;
      }
    }

    // If contains at least one service-ish token, accept
    $serviceTokens = [
      'lead',
      'generation',
      'conversion',
      'website',
      'web',
      'marketing',
      'content',
      'social',
      'google',
      'tracking',
      'reporting',
      'branding',
      'identity',
      'reservation',
      'room',
      'banquet',
      'donation',
      'fundraising',
      'community',
      'education',
      'health',
      'aid'
    ];

    foreach ($serviceTokens as $k) {
      if (str_contains($t, $k)) return false;
    }
    return true;
  }

  private function extractCleanTitle($text)
  {
    $text = trim($text);
    $text = preg_replace('/^(service name|title)\s*:\s*/i', '', $text);
    $text = preg_replace('/^["“”\'`]+|["“”\'`]+$/u', '', $text);
    $text = preg_replace('/^(Here are|Options:|Choose from:).*/i', '', $text);
    $text = preg_replace('/[*_#`~\[\]]/', '', $text);
    $text = preg_replace('/^[\s\-•]+/', '', $text);
    $text = preg_replace('/\n.*$/s', '', $text);
    $text = preg_replace('/\s+/', ' ', $text);
    return trim($text);
  }

  private function extractCleanText($text)
  {
    //remove only the prefix words, not the whole line
    $text = preg_replace('/^(Here are|Here is|Sure|Certainly)\s*[:,\-]?\s*/i', '', trim($text));
    $text = preg_replace('/[*_#`~\[\]""]/', '', $text);
    $text = preg_replace('/^[\s\-•]+/m', '', $text);
    $text = preg_replace('/\s+/', ' ', $text);
    return trim($text);
  }

  private function extractCleanIcon($text)
  {
    $text = preg_replace('/[\+\._,]/', ' ', strtolower(trim($text)));
    $text = preg_replace('/[^a-z0-9\-\s]/', '', $text);
    $text = preg_replace('/\s+/', ' ', $text);

    if (preg_match('/\b(fas|far|fab|fal|fad)?\s*(fa\-[a-z0-9\-]+)/', $text, $matches)) {
      $style = $matches[1] ?: 'fas';
      $icon = $matches[2];
      $clean = $style . ' ' . $icon;
      return $clean;
    }
    return 'fas fa-star';
  }
}
