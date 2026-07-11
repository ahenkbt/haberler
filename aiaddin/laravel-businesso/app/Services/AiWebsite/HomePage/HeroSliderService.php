<?php

namespace App\Services\AiWebsite\HomePage;

use App\Models\User\HeroSlider;
use App\Services\MasterAiGenerator;

class HeroSliderService
{
  protected $ai;
  protected $imageStoragePath = 'assets/front/img/hero_slider/';
  protected $isDeleteOldRecords;

  public function __construct(MasterAiGenerator $ai)
  {
    $this->ai = $ai;
    $this->isDeleteOldRecords = $this->ai->isDeleteOldRecords();
  }

  public function generate()
  {
    // delete old records
    if ($this->isDeleteOldRecords) {
      $userId = $this->ai->getUserId();
      $oldSliders = HeroSlider::where('user_id', $userId)->get();
      foreach ($oldSliders as $slider) {
        if ($slider->img && file_exists(public_path($this->imageStoragePath . $slider->img))) {
          unlink(public_path($this->imageStoragePath . $slider->img));
        }
      }

      HeroSlider::where('user_id', $userId)->delete();
    }

    $width = 1920;
    $height = 925;

    $prompts = $this->getPrompts();

    foreach ($prompts as $index => $prompt) {
      $title    = $this->ai->generateText($prompt['text_prompt']);
      $subtitle = $this->ai->generateText($prompt['subtitle_prompt']);
      $image    = $this->ai->generateImage($prompt['image_prompt'], $width, $height, $this->imageStoragePath);

      HeroSlider::create([
        'user_id'       => $this->ai->getUserId(),
        'language_id'   => $this->ai->getDefaultLanguageId(),
        'img'           => $image,
        'title'         => $title,
        'subtitle'      => $subtitle,
        'btn_name'      => $index === 0 ? 'Get Started Today' : 'Contact Our Team',
        'btn_url'       => $index === 0 ? '/register' : '/contact',
        'serial_number' => $index + 1,
      ]);
    }
  }

  private function getPrompts()
  {
    $businessName = $this->ai->getBusinessName();
    $industry = $this->ai->getIndustry();
    $businessInfo = $this->ai->getBusinessInfo();
    $theme = $this->ai->getTheme();

    $baseContext = "{$businessName} is a leading {$industry} company. {$businessInfo}";

    $commonTexts = [
      [
        'text_prompt' => "Write a bold, attention-grabbing 2-3 word hero slider title for {$businessName} that instantly communicates excellence and trust. Context: {$baseContext}",
        'subtitle_prompt' => "Write a powerful 6-7 word subtitle highlighting the core benefit and unique value. Context: {$baseContext}",
      ],
      [
        'text_prompt' => "Create an emotional hero title (2-3 words) focused on customer success and long-term partnership. Context: {$baseContext}",
        'subtitle_prompt' => "Write a benefit-driven subtitle (6-7 words) mentioning reliability, expertise, and why businesses trust this company. Context: {$baseContext}",
      ],
    ];

    // Theme-specific image prompts
    $imagePrompts = [];

    if ($theme === 'home_nine') {

      $imagePrompts = [
        "Luxurious modern tropical villa on a lush hillside at golden hour sunset, infinity swimming pool in foreground reflecting warm sky, elegant red-orange tiled roofs with clean white walls, expansive floor-to-ceiling sliding glass doors fully open to outdoor living area with modern lounge furniture, dense green jungle and palm trees surrounding, high-end Bali or Phuket resort architecture, bright natural lighting with soft clouds, ultra realistic architectural photography, sharp focus, highly detailed, cinematic composition, 8k resolution, professional DSLR quality",

        "Stunning ocean-view luxury villa exterior at dusk, private infinity pool with underwater lights glowing, contemporary tropical design with warm wood accents and large open terrace, comfortable outdoor seating and dining area, lush tropical landscaping, soft ambient lighting from villa interior spilling out, serene and inviting atmosphere, photorealistic, high detail, sharp focus, golden hour mixed with early evening lights, professional real estate photography style"
      ];
    } elseif ($theme === 'home_eight') {
     
      $imagePrompts = [
        "Modern minimalist office interior with large windows overlooking city skyline at sunset, sleek glass desk with MacBook and creative tools, diverse team of young professionals collaborating happily, warm natural light mixed with modern LED accents, clean lines and neutral tones, high-tech creative agency vibe, ultra sharp, photorealistic corporate photography, cinematic depth of field",

        "Futuristic {$industry} workspace with open-plan layout, collaborative team of professionals brainstorming at glass whiteboard, large digital screens displaying data visualizations, plants and natural wood elements, bright daylight from floor-to-ceiling windows, innovative and energetic atmosphere, professional architectural photography, highly detailed, sharp focus"
      ];
    } else {
     
      $imagePrompts = [
        "ultra high definition corporate photography 1920x925, professional business team of 2 people (1 men in navy suits, 1 women in gray blazers) sitting at conference table, DSLR camera quality, macro lens facial details, individual unique faces with distinct features, realistic skin pores and texture, sharp eyes with detailed iris, natural human imperfections, professional studio lighting, depth of field with sharp focus on faces, photorealistic portrait quality, Canon EOS R5 style, 50mm f/1.8, hyperrealistic human faces, detailed eye reflection, natural skin blemishes, individual unique facial structure, sharp eyelashes --avoid: soft focus, airbrushed skin, plastic appearance, clone faces, uniform features, blurry eyes, synthetic look",

        "1920x925 ultra HD corporate photography, modern {$industry} office, professional business meeting, 1 male executives in navy suits with short hair and 1 female executives in blazers with long hair, sitting around conference table, realistic human faces with clear features, detailed facial anatomy, natural skin tones, sharp focus, professional lighting, photorealistic quality, --avoid blurry, asymmetrical faces, distorted anatomy, cloned face, poorly drawn features"
      ];
    }

    // Build final prompts array
    $sliderPrompts = [];
    foreach ($commonTexts as $index => $text) {
      $sliderPrompts[] = [
        'text_prompt'     => $text['text_prompt'],
        'subtitle_prompt' => $text['subtitle_prompt'],
        'image_prompt'    => $imagePrompts[$index] ?? $imagePrompts[0], 
      ];
    }

    return $sliderPrompts;
  }
}
