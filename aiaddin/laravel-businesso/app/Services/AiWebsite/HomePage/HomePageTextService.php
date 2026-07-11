<?php

namespace App\Services\AiWebsite\HomePage;

use App\Models\User\HomePageText;
use App\Services\MasterAiGenerator;

class HomePageTextService
{
  protected $ai;
  protected $imageStoragePath = 'assets/front/img/user/home_settings/';
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

      $oldHomeText = HomePageText::where('user_id', $userId)
        ->where('language_id', $this->ai->getDefaultLanguageId())
        ->first();

      if ($oldHomeText) {
        $imageFields = [
          'about_image',
          'about_video_image',
          'testimonial_image',
          'video_section_image',
          'why_choose_us_section_image',
          'why_choose_us_section_video_image',
          'work_process_section_img',
          'work_process_section_video_img',
          'contact_section_image',
          'newsletter_image',
          'newsletter_snd_image',
          'counter_section_image',
          'on_sale_section_image',
        ];

        foreach ($imageFields as $field) {
          if ($oldHomeText->$field && file_exists(public_path($this->imageStoragePath . $oldHomeText->$field))) {
            @unlink(public_path($this->imageStoragePath . $oldHomeText->$field));
          }
        }
      }

      HomePageText::where('user_id', $userId)
        ->where('language_id', $this->ai->getDefaultLanguageId())
        ->delete();
    }

    // Delete existing or update
    $homeText = HomePageText::updateOrCreate(
      [
        'user_id' => $this->ai->getUserId(),
        'language_id' => $this->ai->getDefaultLanguageId()
      ],
      $this->generateAllFields()
    );

    return $homeText;
  }

  private function generateAllFields()
  {

    $businessName = $this->ai->getBusinessName();
    $industry = $this->ai->getIndustry();
    $businessInfo = $this->ai->getBusinessInfo();
    $theme = $this->ai->getTheme();
    $pages = $this->ai->getPages();

    $baseContext = "{$businessName} is a leading {$industry} company. {$businessInfo}";

    $qualityEnhancer = ", shot with professional DSLR camera, 85mm portrait lens, hyperrealistic facial details, sharp focus on eyes, natural skin texture with pores, individual unique faces, detailed iris and pupils, realistic human imperfections, studio quality lighting";

    $negativePrompt = ", AVOID: soft blurry faces, plastic skin, airbrushed look, cloned faces, synthetic appearance, uniform features, doll-like skin, low detail eyes";

    $withoutPeople = ", professional photography, sharp focus, high resolution, studio lighting, clean composition, realistic details, vibrant colors, modern design aesthetic, AVOID: blurry, low quality, distorted, poor lighting, artificial appearance, cluttered composition";


    $videoImageDimensions = match ($theme) {
      'home_one' => ['width' => 730, 'height' => 667],
      'home_seven' => ['width' => 1920, 'height' => 597],
      'home_ten' => ['width' => 1170, 'height' => 650],
      default => ['width' => 1920, 'height' => 597],
    };

    $aboutImageDimensions = match ($theme) {
      'home_one' => ['width' => 654, 'height' => 556],
      'home_two' => ['width' => 470, 'height' => 565],
      'home_three' => ['width' => 580, 'height' => 690],
      'home_six' => ['width' => 620, 'height' => 600],
      'home_nine' => ['width' => 570, 'height' => 745],
      'home_eleven' => ['width' => 555, 'height' => 660],
      'home_twelve' => ['width' => 570, 'height' => 508],
      'home_thirteen' => ['width' => 240, 'height' => 240],
      default         => ['width' => 570, 'height' => 508],
    };

    $fields = [];

    // About Section
    if (in_array($theme, ['home_one', 'home_two', 'home_three', 'home_six', 'home_nine', 'home_eleven', 'home_twelve', 'home_thirteen'])) {
 
      if (in_array('about', $pages)) {

        $aboutImagePrompt = "Realistic about us image for {$businessName}, {$industry} business. "
          . "{$businessInfo} "
          . "Show a warm, trustworthy atmosphere in a real working environment, natural colors, friendly expression, professional look"
          . $qualityEnhancer . $negativePrompt;

        if ($theme === 'home_nine') {

          $aboutImagePrompt = "Portrait oriented realistic lifestyle image for a hotel business. "
            . "A confident guest walking inside a luxury hotel room, pulling a suitcase, "
            . "single person, only one subject, no other people in background,"
            . "natural candid moment, modern premium interior, "
            . "bright window light, warm neutral tones, calm trustworthy mood, "
            . "high-end hospitality photography"
            . $qualityEnhancer . $negativePrompt;
        }

        $aboutFields = [
          'about_title' => $this->ai->generateText(
            "You are a professional brand copywriter. " .
              "Using the details below, write a strong main heading for the About Us section " .
              "of the website for {$businessName}, a {$industry} business. " .
              "Business details: {$businessInfo}. " .
              "Requirements: " .
              "- Use only 4 to 5 words (maximum 45 characters, including spaces). " .
              "- Make it clear, confident, and benefit-focused. " .
              "- Use simple, clean language with no special characters, symbols, colons, periods, or other punctuation marks. " .
              "- Do not use quotation marks, formatting, or any explanation text. " .
              "Return only the final plain text heading."
          ),

          'about_subtitle' => $this->ai->generateText(
            "You are a professional marketing copywriter. " .
              "Write an engaging subheading for the About Us section of {$businessName}, " .
              "which operates in the {$industry} industry. " .
              "Business details: {$businessInfo}. " .
              "Requirements: " .
              "- Use 6 to 8 words (maximum 70 characters, including spaces). " .
              "- Emphasize how the business helps its customers. " .
              "- Keep the tone friendly and professional. " .
              "- Use simple, clean language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
              "- Do not use quotation marks, formatting, or any explanation text. " .
              "Return only the final plain text subheading."
          ),

          'about_content' => $this->ai->generateText(
            "You are a skilled website copywriter. " .
              "Write a concise, compelling 'About Us' paragraph for the homepage of {$businessName}, " .
              "a {$industry} business. " .
              "Business details: {$businessInfo}. " .
              "Requirements: " .
              "- Use 35 to 50 words (maximum 320 characters, including spaces). " .
              "- Write in third person (use 'they' / the company name, not 'I' or 'we'). " .
              "- Clearly describe what the business does and the main benefits for customers. " .
              "- Keep the tone warm, trustworthy, and professional. " .
              "- Do not include any headings, bullet points, quotes, or explanation text. " .
              "Return only the final paragraph text."
          ),

          'about_video_url'   => 'https://www.youtube.com/watch?v=default',
          'about_button_text' => 'Learn More About Us',
          'about_button_url'  => '/about',

          'about_image' => $this->ai->generateImage(
            $aboutImagePrompt,

            $aboutImageDimensions['width'],
            $aboutImageDimensions['height'],

            $this->imageStoragePath
          ),

          'about_video_image' => $this->ai->generateImage(
            "professional video thumbnail featuring diverse business team in {$industry} workspace, mixed gender group collaborating at modern office, prominent circular play button icon centered as overlay, cinematic video preview composition" . $qualityEnhancer . $negativePrompt,
            800,
            450,
            $this->imageStoragePath
          ),
        ];

        if ($theme === 'home_eleven') {
          $aboutFields = array_merge($aboutFields, [
            'about_snd_button_text' => 'Future Plans',
            'about_snd_button_url'  => 'example.com/future-plans',
          ]);
        }

        $fields = array_merge($fields, $aboutFields);
      }
    }

    // Services Section
    if (in_array($theme, ['home_one', 'home_two', 'home_three', 'home_four', 'home_five', 'home_six', 'home_seven', 'home_nine', 'home_twelve'])) {
      $fields = array_merge(
        $fields,
        [
          'service_title' => $this->ai->generateText(
            "Act as a professional website copywriter. " .
              "Write a clear main heading for the Services section " .
              "of the website for {$businessName}, a {$industry} business. " .
              "Use only 2 to 4 words, maximum 25 characters. " .
              "Focus on what the company offers to clients. " .
              "Use simple, clean language with no special characters, symbols, colons, periods, or punctuation marks. " .
              "Do not add any explanation, quotes, or formatting. " .
              "Return only the final plain text heading."
          ),

          'service_subtitle' => $this->ai->generateText(
            "You are a skilled marketing copywriter. " .
              "Write an engaging subheading for the Services section of {$businessName}, " .
              "a {$industry} business. " .
              "Business details: {$businessInfo}. " .
              "Requirements: " .
              "- Use 4 to 6 words (maximum 40 characters, including spaces). " .
              "- Emphasize how the business helps its customers. " .
              "- Keep the tone friendly and professional. " .
              "- Use simple, clean language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
              "- Do not use quotation marks, formatting, or any explanation text. " .
              "Return only the final plain text subheading."
          ),
        ]
      );
    }

    // Skill section
    if (in_array($theme, ['home_one', 'home_twelve'])) {
      $fields = array_merge(
        $fields,
        [
          'skills_title' => $this->ai->generateText(
            "You are a professional brand copywriter. " .
              "Write a short, compelling main heading for the Skills or Our Expertise section " .
              "of the website for {$businessName}, a {$industry} business. " .
              "Business details: {$businessInfo}. " .
              "Requirements: " .
              "- Use only 2 to 3 words (maximum 30 characters, including spaces). " .
              "- Make it clear, confident, and capability-focused. " .
              "- Emphasize expertise, strengths, or competencies. " .
              "- Use simple, clean language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
              "- Do not use quotation marks, formatting, or any explanation text. " .
              "Return only the final plain text heading."
          ),

          'skills_subtitle' => $this->ai->generateText(
            "You are a professional marketing copywriter. " .
              "Write an engaging subheading for the Skills or Our Expertise section of {$businessName}, " .
              "which operates in the {$industry} industry. " .
              "Business details: {$businessInfo}. " .
              "Requirements: " .
              "- Use 4 to 6 words (maximum 70 characters, including spaces). " .
              "- Emphasize how the company’s skills help its customers. " .
              "- Keep the tone friendly and professional. " .
              "- Use simple, clean language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
              "- Do not use quotation marks, formatting, or any explanation text. " .
              "Return only the final plain text subheading."
          ),

          'skills_content' => $this->ai->generateText(
            "You are a skilled website copywriter. " .
              "Write a concise, compelling 'About Us' paragraph for the homepage of {$businessName}, " .
              "a {$industry} business. " .
              "Business details: {$businessInfo}. " .
              "Requirements: " .
              "- Use 35 to 50 words (maximum 320 characters, including spaces). " .
              "- Write in third person (use 'they' / the company name, not 'I' or 'we'). " .
              "- Clearly describe what the business does and the main benefits for customers. " .
              "- Keep the tone warm, trustworthy, and professional. " .
              "- Do not include any headings, bullet points, quotes, or explanation text. " .
              "Return only the final paragraph text."
          ),
        ]
      );
    }

    // Portfolio Section
    if (in_array($theme, ['home_one', 'home_two', 'home_three', 'home_four', 'home_five', 'home_six', 'home_seven', 'home_twelve'])) {
      $fields = array_merge($fields, [
        'portfolio_title' => $this->extractCleanTitle(
          $this->ai->generateText(
            "You must return ONLY a plain text heading of 2-4 words. No formatting, no explanation.
          Generate a compelling portfolio section heading for {$businessName} in {$industry} industry.
          Output format: Plain text only, no asterisks, no bold, no special characters.
          Do NOT use markdown formatting like **text** or __text__.
          Good examples: Our Projects, Featured Work, Success Stories, Portfolio Showcase
          Context: {$baseContext}"
          )
        ),

        'portfolio_subtitle' => $this->ai->generateText(
          "You are a skilled marketing copywriter. " .
            "Write an engaging subheading for the Portfolio section of {$businessName}, " .
            "which operates in the {$industry} industry. " .
            "Business details: {$businessInfo}. " .
            "Requirements: " .
            "- Use 5 to 7 words (maximum 70 characters, including spaces). " .
            "- Explain what makes their portfolio or projects valuable to clients. " .
            "- Keep the tone professional, confident, and benefit-focused. " .
            "- Use simple, clean language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
            "- Do not use quotation marks, formatting, or any explanation text. " .
            "Return only the final plain text subheading."
        ),

        'view_all_portfolio_text' => $this->ai->generateText(
          "You are a UX copywriter. " .
            "Write a short call-to-action button text for a link to the full portfolio page. " .
            "Requirements: " .
            "- Use only 2 to 4 words (maximum 30 characters, including spaces). " .
            "- Be action-oriented and clear. " .
            "- Examples: 'View All Projects', 'See Our Work', 'Explore Portfolio', 'View Portfolio'. " .
            "- Do not use quotation marks or any explanation text. " .
            "Return only the final button text."
        ),
      ]);
    }

    // Testimonial Section
    if (in_array($theme, ['home_one', 'home_two', 'home_three', 'home_four', 'home_five', 'home_six', 'home_seven', 'home_eleven', 'home_nine', 'home_twelve'])) {
      $fields = array_merge(
        $fields,
        [
          'testimonial_title' => $this->ai->generateText(
            "You are a professional copywriter. " .
              "Write a compelling main heading for the Client Testimonials or What Our Clients Say section " .
              "of the website for {$businessName}, a {$industry} business. " .
              "Business details: {$businessInfo}. " .
              "Requirements: " .
              "- Use only 2 to 4 words (maximum 20 characters, including spaces). " .
              "- Emphasize trust, satisfaction, and social proof. " .
              "- Use simple, clean language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
              "- Do not use quotation marks, formatting, or any explanation text. " .
              "Return only the final plain text heading."
          ),

          'testimonial_subtitle' => $this->ai->generateText(
            "You are a skilled marketing copywriter. " .
              "Write an engaging subheading for the Client Testimonials section of {$businessName}, " .
              "a {$industry} business. " .
              "Business details: {$businessInfo}. " .
              "Requirements: " .
              "- Use 6 to 8 words (maximum 70 characters, including spaces). " .
              "- Highlight why customer feedback matters and what makes their testimonials valuable. " .
              "- Keep the tone warm, professional, and inviting. " .
              "- Use simple, clean language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
              "- Do not use quotation marks, formatting, or any explanation text. " .
              "Return only the final plain text subheading."
          ),
        ]
      );
    }


    if (in_array($theme, ['home_one', 'home_six', 'home_ten'])) {

      if ($theme === 'home_ten') {

        $prompt = "minimalist seamless white background pattern, very soft light gray small dots evenly scattered across canvas, subtle abstract texture, flat 2D design, no people, no objects, no text, ultra clean modern website background, low contrast, perfect for hero section overlay, 1920x814 aspect ratio";
        $width  = 1920;
        $height = 814;
      } elseif ($theme === 'home_six') {

        $prompt = "professional law firm website background, elegant office interior, justice scale and law books on desk, serious and trustworthy atmosphere, dark blue and gold accents, minimal hero section" . $qualityEnhancer . $negativePrompt;
        $width  = 1920;
        $height = 918;
      } else {

        $prompt = "professional testimonials section background image, {$industry} workplace, satisfied happy clients smiling, modern office environment, warm friendly atmosphere, diverse team collaboration" . $qualityEnhancer . $negativePrompt;
        $width  = 661;
        $height = 700;
      }
      $fields = array_merge(
        $fields,
        [
          'testimonial_image' => $this->ai->generateImage(
            $prompt,
            $width,
            $height,
            $this->imageStoragePath
          ),
        ]
      );
    }

    // Team Section for all theme

    $fields = array_merge(
      $fields,
      [
        'team_section_title' => $this->ai->generateText(
          "You are a professional brand copywriter. " .
            "Write a short, compelling main heading for the Our Team or Meet the Team section " .
            "of the website for {$businessName}, a {$industry} business. " .
            "Business details: {$businessInfo}. " .
            "Requirements: " .
            "- Use only 3 to 4 words (maximum 30 characters, including spaces). " .
            "- Emphasize professionalism, expertise, and the people behind the brand. " .
            "- Use simple, clean language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
            "- Do not use quotation marks, formatting, or any explanation text. " .
            "Return only the final plain text heading."
        ),

        'team_section_subtitle' => $this->ai->generateText(
          "You are a skilled marketing copywriter. " .
            "Write an engaging subheading for the professional team section of {$businessName}, " .
            "a {$industry} business. " .
            "Business details: {$businessInfo}. " .
            "Requirements: " .
            "- Use 5 to 7 words (maximum 70 characters, including spaces). " .
            "- Highlight experience, dedication, and how the team helps clients. " .
            "- Keep the tone warm, trustworthy, and professional. " .
            "- Use simple, clean language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
            "- Do not use quotation marks, formatting, or any explanation text. " .
            "Return only the final plain text subheading."
        ),
      ]
    );

    // Blog Section
    if (in_array($theme, ['home_one', 'home_two', 'home_four', 'home_five', 'home_six', 'home_seven', 'home_eleven', 'home_twelve'])) {
      $fields = array_merge(
        $fields,
        [
          'blog_title' => $this->ai->generateText(
            "You are a professional web copywriter. " .
              "Write a short, catchy main heading for the Blog or Latest Articles section " .
              "of the website for {$businessName}, a {$industry} business. " .
              "Business details: {$businessInfo}. " .
              "Requirements: " .
              "- Use only 2 to 3 words (maximum 25 characters, including spaces). " .
              "- Make it clear and easy to scan. " .
              "- Emphasize learning, insights, or updates. " .
              "- Use simple, clean language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
              "- Do not use quotation marks, formatting, or any explanation text. " .
              "Return only the final plain text heading."
          ),

          'blog_subtitle' => $this->ai->generateText(
            "You are a skilled marketing copywriter. " .
              "Write an engaging subheading for the Blog or Latest Articles section " .
              "of the website for {$businessName}, a {$industry} business. " .
              "Business details: {$businessInfo}. " .
              "Requirements: " .
              "- Use 8 to 9 words (maximum 70 characters, including spaces). " .
              "- Emphasize value, insights, and thought leadership. " .
              "- Keep the tone professional, informative, and engaging. " .
              "- Use simple, clean language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
              "- Do not use quotation marks, formatting, or any explanation text. " .
              "Return only the final plain text subheading."
          ),

          'view_all_blog_text' => $this->ai->generateText(
            "You are a UX copywriter. " .
              "Write a short call-to-action button text for a link to the full blog or articles page. " .
              "Requirements: " .
              "- Use only 2 to 4 words (maximum 30 characters, including spaces). " .
              "- Be action-oriented, clear, and inviting. " .
              "- Examples: 'Read All Articles', 'View All Posts', 'Explore Blog', 'Browse Articles'. " .
              "- Do not use quotation marks or any explanation text. " .
              "Return only the final button text."
          ),
        ]
      );
    }

    // Video Section
    if (in_array($theme, ['home_one', 'home_two', 'home_four', 'home_five', 'home_seven', 'home_nine', 'home_ten', 'home_thirteen'])) {

      $fields = array_merge($fields, [
        'video_section_title' => $this->ai->generateText(
          "You must return ONLY ONE title of 2-3 words maximum. No explanation, no options.
        Generate a powerful, catchy video section heading for {$businessName} in {$industry} industry.
        Output format: Just 2-3 words, nothing else.
        Good examples: Our Story, Company Journey, Meet Our Team, Behind Scenes, Our Vision
        Context: {$baseContext}"
        ),

        'video_section_subtitle' => $this->ai->generateText(
          "You must return ONLY ONE subtitle of 5-6 words maximum. No explanation, no options.
        Generate an engaging video section subtitle that highlights the company story of {$businessName}.
        Output format: Just 5-6 words, nothing else. Use simple, inspiring language.
        Good examples: Discover our journey to success, Learn about our passionate team, See how we make difference
        Context: {$baseContext}"
        ),

        'video_section_text' => $this->ai->generateText(
          "You must return EXACTLY 2 sentences. No more, no less.
        Write a compelling introduction for the company video of {$businessName}.
        First sentence: Describe what viewers will see in the video (1 sentence).
        Second sentence: Explain why they should watch it (1 sentence).
        Keep each sentence under 20 words. Use engaging, professional tone.
        Context: {$baseContext}"
        ),

        'video_section_button_text' => 'Watch Our Story',

        'video_section_button_url' => '/about',

        'video_section_url' => 'https://www.youtube.com/watch?v=default',

      ]);

      if ($theme === 'home_ten') {
        $fields = array_merge(
          $fields,
          [
            'video_section_image' => $this->ai->generateImage(
              "Young professional man giving thumbs up, holding real estate brochure, light blue shirt, modern office background, two colleagues blurred in background, bright natural lighting, corporate photography, sharp focus on front person, professional DSLR quality" . $qualityEnhancer . $negativePrompt,
              $videoImageDimensions['width'],
              $videoImageDimensions['height'],
              $this->imageStoragePath
            ),
          ]
        );
      }elseif($theme === 'home_nine'){
        $fields = array_merge(
          $fields,
          [
            'video_section_image' => $this->ai->generateImage(
              "Luxurious modern tropical villa on a lush hillside overlooking the ocean, infinity swimming pool in the foreground reflecting the sky, traditional red-orange tiled roofs with white walls, large floor-to-ceiling sliding glass doors opening to spacious outdoor terrace with modern furniture and seating area, open-concept indoor-outdoor living, warm golden hour sunset lighting with soft clouds, dense green jungle and palm trees in the background, high-end resort style like Thailand or Bali, bright natural atmosphere, professional architectural photography, ultra sharp focus, highly detailed, cinematic composition" . $qualityEnhancer . $negativePrompt,
              $videoImageDimensions['width'],
              $videoImageDimensions['height'],
              $this->imageStoragePath
            ),
          ]
        );
      } else {
        $fields = array_merge(
          $fields,
          [
            'video_section_image' => $this->ai->generateImage(
              "Professional business team of 3 diverse people waving at camera, modern office background with geometric patterns, bright and welcoming atmosphere, corporate photography style, {$industry} workplace setting" . $qualityEnhancer . $negativePrompt,
              $videoImageDimensions['width'],
              $videoImageDimensions['height'],
              $this->imageStoragePath
            ),
          ]
        );
      }
    }

    // Why Choose Us Section
    if (in_array($theme, ['home_one', 'home_three', 'home_nine'])) {
      $fields = array_merge(
        $fields,
        [
          'why_choose_us_section_title' => $this->extractCleanTitle(
            $this->ai->generateText(
              "You must return ONLY a plain text heading of 2-3 words maximum. No formatting, no explanation.
              Generate a compelling 'Why Choose Us' section title for {$businessName}.
              Output format: Plain text only, no asterisks, no markdown, no special characters.
              Good examples: Why Choose Us, Our Advantage, Why Us, Choose Excellence
              Context: {$baseContext}"
            )
          ),

          'why_choose_us_section_subtitle' => $this->extractCleanTitle(
            $this->ai->generateText(
              "You must return ONLY a plain text subtitle of 4-5 words maximum. No formatting, no explanation.
              Generate a subtitle explaining the competitive advantage of {$businessName} in {$industry}.
              Output format: Plain text only, 4-5 words, no punctuation at the end.
              Good examples: Experience you can trust, Quality that sets apart, Excellence in every detail
              Context: {$baseContext}"
            )
          ),

          'why_choose_us_section_text' => $this->extractCleanTitle(
            $this->ai->generateText(
              "You must return EXACTLY 30-35 words. Count carefully. No formatting, no explanation.
          Write a compelling paragraph about what makes {$businessName} unique and the best choice in {$industry}.
          Focus on: competitive advantages, unique value proposition, and customer benefits.
          Output format: Plain text paragraph, exactly 30-35 words total.
          Context: {$baseContext}"
            )
          ),

          'why_choose_us_section_button_text' => 'Discover More',

          'why_choose_us_section_button_url' => '/services',

          'why_choose_us_section_video_url' => 'https://www.youtube.com/watch?v=default',

          'why_choose_us_section_image' => $this->ai->generateImage(
            "flat illustration style professional person in orange business attire in thinking pose with hand on chin, clean white background with decorative abstract shapes and question marks floating around, thumbs up and thumbs down icons in circular frames at top corners, minimalist modern illustration design, {$industry} professional character, simple geometric decorative elements, vector art style, friendly approachable illustration",
            395,
            430,
            $this->imageStoragePath
          ),

          'why_choose_us_section_video_image' => $this->ai->generateImage(
            "Corporate video thumbnail showing {$industry} expertise and professionalism, business presentation scene with play button overlay, clean modern design, professional quality"  . $qualityEnhancer . $negativePrompt,
            800,
            450,
            $this->imageStoragePath
          ),
        ]
      );
    }

    // Work Process Section
    if (in_array($theme, ['home_two', 'home_three', 'home_four', 'home_five', 'home_six', 'home_seven'])) {
      $fields = array_merge($fields, [
        'work_process_section_title' => $this->ai->generateText("Write work process section title"),
        'work_process_section_subtitle' => $this->ai->generateText("Write subtitle about company workflow"),
        'work_process_section_text' => $this->ai->generateText("Write 2 sentences about {$businessName} work methodology"),
        'work_process_btn_txt' => 'Learn Our Process',
        'work_process_btn_url' => '/how-it-works',
        'work_process_section_video_url' => 'https://www.youtube.com/watch?v=default',
        'work_process_section_img' => $this->ai->generateImage(
          "work process visualization, {$industry} workflow diagram, professional team collaboration",
          1000,
          600,
          $this->imageStoragePath
        ),
        'work_process_section_video_img' => $this->ai->generateImage(
          "work process video thumbnail, step-by-step methodology",
          800,
          450,
          $this->imageStoragePath
        ),
      ]);
    }

    // Quote Section
    if (in_array($theme, ['home_three', 'home_four', 'home_five', 'home_six', 'home_seven'])) {
      $fields = array_merge(
        $fields,
        [
          'quote_section_title' => $this->ai->generateText(
            "Write a motivational section title for a quote block in 4-5 words only. 
            Industry: {$industry}. 
            Business name: {$businessName}. 
            Context: {$baseContext}. 
            Use a professional, inspiring tone."
          ),

          'quote_section_subtitle' => $this->ai->generateText(
            "Write an inspiring subtitle for the quote section in 20-25 words. 
          Industry: {$industry}. 
          Business name: {$businessName}. 
          Context: {$baseContext}. 
          Address the audience to encourage positive action and engagement."
          ),
        ]
      );
    }

    // FAQ Section
    if (in_array($theme, ['home_three', 'home_four', 'home_five', 'home_seven'])) {
      $fields = array_merge($fields, [
        'faq_section_title' => $this->ai->generateText(
          "You are a professional web copywriter. " .
            "Write a short, clear main heading for the FAQ or Frequently Asked Questions section " .
            "of the website for {$businessName}, a {$industry} business. " .
            "Business details: {$businessInfo}. " .
            "Requirements: " .
            "- Use only 2 to 3 words (maximum 15 characters, including spaces). " .
            "- Make it simple, direct, and easy to understand. " .
            "- Examples: Common Questions, Your Questions, FAQ, Questions Answered. " .
            "- Use simple, clean language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
            "- Do not use quotation marks, formatting, or any explanation text. " .
            "Return only the final plain text heading."
        ),

        'faq_section_subtitle' => $this->ai->generateText(
          "You are a skilled marketing copywriter. " .
            "Write an engaging subheading for the FAQ section of {$businessName}, " .
            "a {$industry} business. " .
            "Business details: {$businessInfo}. " .
            "Requirements: " .
            "- Use 5 to 6 words (maximum 30 characters, including spaces). " .
            "- Emphasize helpfulness and encourage users to find answers. " .
            "- Keep the tone friendly, supportive, and professional. " .
            "- Examples: Find quick answers to your common questions, Get the information you need right here. " .
            "- Use simple, clean language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
            "- Do not use quotation marks, formatting, or any explanation text. " .
            "Return only the final plain text subheading."
        ),
      ]);
    }

    // Contact Section
    if (in_array($theme, ['home_three', 'home_six', 'home_seven'])) {
      $fields = array_merge(
        $fields,
        [
          'contact_section_title' => $this->ai->generateText(
            "You are a professional web copywriter. " .
              "Write a short, clear main heading for the Contact Us section " .
              "of the website for {$businessName}, a {$industry} business. " .
              "Business details: {$businessInfo}. " .
              "Requirements: " .
              "- Use only 2 to 3 words (maximum 25 characters, including spaces). " .
              "- Make it simple, direct, and inviting. " .
              "- Examples: Get In Touch, Contact Us, Reach Out, Connect Today. " .
              "- Use simple, clean language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
              "- Do not use quotation marks, formatting, or any explanation text. " .
              "Return only the final plain text heading."
          ),

          'contact_section_subtitle' => $this->ai->generateText(
            "You are a skilled marketing copywriter. " .
              "Write an engaging subheading for the Contact Us section of {$businessName}, " .
              "a {$industry} business. " .
              "Business details: {$businessInfo}. " .
              "Requirements: " .
              "- Write EXACTLY 7 to 9 words with proper spacing between each word. " .
              "- Maximum 45 characters including spaces. " .
              "- Each word must be separated by a single space. " .
              "- Emphasize accessibility, responsiveness, and willingness to help. " .
              "- Keep the tone warm, welcoming, and professional. " .
              "- Good examples: We are here to answer your questions | Ready to help you get started today | Let us help you achieve your goals. " .
              "- Bad examples: WeAreHereToHelp | ContactUsToday | GetInTouchNow. " .
              "- Use proper sentence structure with spaces between words. " .
              "- Do not use special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
              "- Do not use quotation marks, formatting, or any explanation text. " .
              "- Each word should start with a capital letter if needed, but maintain natural spacing. " .
              "Return only the final plain text subheading with proper word spacing."
          ),
        ]
      );
    }
    if (in_array($theme, ['home_three', 'home_four', 'home_five', 'home_six', 'home_seven', 'home_twelve'])) {
      $fields = array_merge(
        $fields,
        [
          'contact_section_image' => $this->ai->generateImage(
            "professional customer service representative with headset smiling warmly, modern office environment, {$industry} business setting, friendly and welcoming atmosphere, bright professional lighting, corporate reception desk background and white background" . $qualityEnhancer . $negativePrompt,
            755,
            1220,
            $this->imageStoragePath
          ),
        ]
      );
    }

    // Newsletter Section
    if (in_array($theme, ['home_eight', 'home_ten', 'home_eleven', 'home_thirteen'])) {

      $fields = array_merge($fields, [
        'newsletter_title' => $this->ai->generateText(
          "You are a professional email marketing copywriter. " .
            "Write a short, clear main heading for the Newsletter Subscription or Email Signup section " .
            "of the website for {$businessName}, a {$industry} business. " .
            "Business details: {$businessInfo}. " .
            "Requirements: " .
            "- Use only 2 to 4 words (maximum 30 characters, including spaces). " .
            "- Make it inviting and engagement-focused. " .
            "- Examples: Join Our Newsletter, Stay Updated, Subscribe Today, Get Updates. " .
            "- Use simple, clear language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
            "- Do not use quotation marks, formatting, or any explanation text. " .
            "Return only the final plain text heading."
        ),

        'newsletter_subtitle' => $this->ai->generateText(
          "You are a skilled email marketing copywriter. " .
            "Write an engaging subheading for the Newsletter Subscription section of {$businessName}, " .
            "a {$industry} business. " .
            "Business details: {$businessInfo}. " .
            "Requirements: " .
            "- Use 8 to 10 words (maximum 75 characters, including spaces). " .
            "- Emphasize benefits like exclusive updates, tips, offers, or insights. " .
            "- Keep the tone friendly, encouraging, and value-focused. " .
            "- Examples: Get exclusive updates and special offers delivered weekly | Subscribe for insights tips and news you love. " .
            "- Use simple, clear language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
            "- Do not use quotation marks, formatting, or any explanation text. " .
            "Return only the final plain text subheading."
        ),
      ]);
    }

    if ($theme === 'home_ten') {

      $qualityEnhancer = ", shot with professional Canon EOS R5 camera, 85mm f/1.4 portrait lens, " .
        "shallow depth of field with creamy bokeh background, " .
        "golden hour warm lighting from side, " .
        "soft sunset glow on face, beautiful rim lighting, " .
        "hyperrealistic skin texture with natural pores, " .
        "sharp focus on eyes and face, perfectly sharp eyelashes, " .
        "professional color grading with warm tones, " .
        "cinematic photography style, editorial quality, 8k resolution";

      $negativePrompt = ", NEGATIVE: blurry face, soft focus on subject, harsh lighting, " .
        "overexposed face, underexposed shadows, flat lighting, " .
        "cluttered sharp background, no background blur, " .
        "plastic skin, airbrushed look, artificial smooth skin, " .
        "bad eyes, distorted facial features, asymmetrical face, " .
        "low resolution, jpeg artifacts, pixelated, " .
        "cartoon style, 3D render, painting, illustration, " .
        "unnatural colors, oversaturated, desaturated, cold tones";

      $newsletterImagePrompt = "Professional graduation portrait photography: " .
        "beautiful young South Asian female graduate with long flowing brown hair, " .
        "wearing black graduation gown and black mortarboard cap, " .
        "standing on university campus pathway, " .
        "elegant over-the-shoulder pose looking back at camera, " .
        "body turned 45 degrees away with head turned towards camera, " .
        "natural confident smile showing teeth, genuine happy expression, " .
        "warm golden hour sunset lighting creating soft glow on face, " .
        "side lighting with beautiful rim light on hair, " .
        "university campus buildings softly blurred in background, " .
        "warm orange and pink tones in blurred background bokeh, " .
        "autumn leaves and campus architecture out of focus, " .
        "subject in sharp focus with creamy smooth background blur, " .
        "professional editorial style portrait photography, " .
        "warm color palette with golden and orange hues" .
        $qualityEnhancer . $negativePrompt;


      $fields = array_merge($fields, [
        'newsletter_image' => $this->ai->generateImage(
          $newsletterImagePrompt,
          520,
          640,
          $this->imageStoragePath
        ),
      ]);
    } elseif ($theme === 'home_thirteen') {

      $fields = array_merge($fields, [
        'newsletter_image' => $this->ai->generateImage(
          "small newsletter icon illustration for blog website, envelope and paper, minimal flat design, blog and article reading theme, simple recognizable newsletter badge" . $withoutPeople,
          112,
          85,
          $this->imageStoragePath
        ),
      ]);
    }

    if ($theme === 'home_ten') {

      $negativePrompt = ", NEGATIVE: blurry face, soft focus on face, blurry mouth, unclear lips, " .
        "multiple heads, deformed mouth, distorted lips, asymmetrical lips, " .
        "deformed eyes, asymmetrical eyes, crossed eyes, lazy eye, " .
        "bad teeth, crooked teeth, missing teeth, yellow teeth, " .
        "closed mouth, lips pressed together, mouth covered, " .
        "extra limbs, mutated hands, fused fingers, extra fingers, " .
        "low resolution, jpeg artifacts, watermark, text overlay, logo, " .
        "artificial lighting, overexposed face, underexposed face, harsh shadows on face, " .
        "plastic skin, waxy skin, smooth plastic texture, airbrushed skin, " .
        "painting style, 3D render, cartoon style, anime, illustration, drawing, " .
        "blurry teeth, transparent teeth, fake smile, forced expression";


      $newsletterBgImagePrompt = "Professional editorial photograph: " .
        "Portrait of 2 university students walking towards camera, " .
        "beautiful South Asian female student in center focus wearing turquoise casual top, " .
        "handsome male student beside her in denim shirt holding coffee cup, " .
        "both looking directly at camera with genuine natural smiles, " .
        "perfect white teeth visible, detailed lips with natural texture, " .
        "well-defined mouth corners, symmetrical smile lines, " .
        "clear dental structure, healthy tooth enamel, " .
        "photorealistic lip details with natural gloss, " .
        "modern university campus with blue glass building in soft background blur, " .
        "warm afternoon sunlight from left side, " .
        "shot on Canon EOS R5, 85mm f/1.4 lens, " .
        "hyperrealistic facial details, perfect eye contact, " .
        "sharp focus on faces especially mouth area, " .
        "natural skin texture with pores, visible facial hair detail, " .
        "professional color grading, 8k resolution" .
        $negativePrompt;

      $fields = array_merge($fields, [
        'newsletter_snd_image' => $this->ai->generateImage(
          $newsletterBgImagePrompt,
          476,
          880,
          $this->imageStoragePath
        ),
      ]);
    }

    if ($theme === 'home_ten') {


      $studentBannerPrompt =
        "the website hero banner showing four school children learning together around a laptop compuwiter, " .
        "two boys and two girls sitting in a bright modern classroom, colorful casual clothes, " .
        "happy focused expressions, large windows with soft daylight in background, " .
        "clean education technology concept, e-learning and online courses, " .
        "flat turquoise abstract shape decorations on left and right edges of banner, " .
        "high-quality professional photography, warm and friendly atmosphere, " .
        "no text on image";

      $studentBannerPrompt .= $qualityEnhancer . $negativePrompt;

      $fields = array_merge($fields, [
        'counter_section_image' => $this->ai->generateImage(
          $studentBannerPrompt,
          1920,
          531,
          $this->imageStoragePath
        ),
      ]);
    } elseif ($theme === 'home_six') {

      $fields = array_merge($fields, [
        'counter_section_image' => $this->ai->generateImage(
          "professional law firm achievements banner, clean dark blue background, subtle courthouse and justice scale icons, highlighted statistics such as cases won, years of experience, satisfied clients, and awards, elegant badges and trust seals, serious and trustworthy legal theme",
          412,
          235,
          $this->imageStoragePath
        ),
      ]);
    }

    // Donation / Charity Sections
    if (in_array($theme, ['home_eleven'])) {
      $fields = array_merge(
        $fields,
        [
          'featured_section_title' => $this->ai->generateText(
            "You are a professional web copywriter. " .
              "Write a short, catchy main heading for the Featured Items or Featured Services section " .
              "of the website for {$businessName}, a {$industry} business. " .
              "Business details: {$businessInfo}. " .
              "Requirements: " .
              "- Use only 2 to 3 words (maximum 25 characters, including spaces). " .
              "- Make it clear, attention-grabbing, and highlight-focused. " .
              "- Examples: Featured Services, Top Picks, Our Highlights, Best Selections. " .
              "- Use simple, clean language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
              "- Do not use quotation marks, formatting, or any explanation text. " .
              "Return only the final plain text heading."
          ),

          'featured_section_subtitle' => $this->ai->generateText(
            "You are a skilled marketing copywriter. " .
              "Write an engaging subheading for the Featured Items or Featured Services section " .
              "of the website for {$businessName}, a {$industry} business. " .
              "Business details: {$businessInfo}. " .
              "Requirements: " .
              "- Use 7 to 9 words (maximum 70 characters, including spaces). " .
              "- Emphasize quality, value, and what makes these items or services special. " .
              "- Keep the tone professional, compelling, and benefit-focused. " .
              "- Examples: Discover our most popular and trusted solutions | Explore the best we have to offer today. " .
              "- Use simple, clean language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
              "- Do not use quotation marks, formatting, or any explanation text. " .
              "Return only the final plain text subheading."
          ),
          'donor_title' => $this->ai->generateText(
            "You are a professional nonprofit website copywriter. " .
              "Write a short, clear main heading for the Our Donors or Supporters section " .
              "of the website for {$businessName}, a {$industry} organization. " .
              "Business details: {$businessInfo}. " .
              "Requirements: " .
              "- Use only 2 to 3 words (maximum 25 characters, including spaces). " .
              "- Make it appreciative, respectful, and recognition-focused. " .
              "- Examples: Our Supporters, Valued Donors, Thank Supporters, Generous Partners. " .
              "- Use simple, clear language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
              "- Do not use quotation marks, formatting, or any explanation text. " .
              "Return only the final plain text heading."
          ),
          'causes_section_title' => $this->ai->generateText(
            "You are a professional nonprofit website copywriter. " .
              "Write a short, clear main heading for the Our Causes or Social Causes section " .
              "of the website for {$businessName}, a {$industry} organization. " .
              "Business details: {$businessInfo}. " .
              "Requirements: " .
              "- Use only 2 to 3 words (maximum 25 characters, including spaces). " .
              "- Make it compassionate, purposeful, and mission-focused. " .
              "- Examples: Our Causes, Making Impact, Help Communities, Support Change. " .
              "- Use simple, clear language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
              "- Do not use quotation marks, formatting, or any explanation text. " .
              "Return only the final plain text heading."
          ),

          'causes_section_subtitle' => $this->ai->generateText(
            "You are a skilled nonprofit marketing copywriter. " .
              "Write an engaging subheading for the Causes section of {$businessName}, " .
              "a {$industry} organization. " .
              "Business details: {$businessInfo}. " .
              "Requirements: " .
              "- Use 7 to 9 words (maximum 70 characters, including spaces). " .
              "- Emphasize impact, community support, and the difference donations make. " .
              "- Keep the tone inspiring, compassionate, and action-oriented. " .
              "- Examples: Join us in making real change today | Support causes that transform lives every day. " .
              "- Use simple, clear language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
              "- Do not use quotation marks, formatting, or any explanation text. " .
              "Return only the final plain text subheading."
          ),

          'category_section_title' => $this->ai->generateText(
            "You are a professional e-commerce copywriter. " .
              "Write a short, clear main heading for the Product Categories or Browse Categories section " .
              "of the website for {$businessName}, a {$industry} business. " .
              "Business details: {$businessInfo}. " .
              "Requirements: " .
              "- Use only 2 to 3 words (maximum 25 characters, including spaces). " .
              "- Make it clear and easy to understand. " .
              "- Examples: Shop Categories, Browse Products, Our Collections, Product Range. " .
              "- Use simple, clean language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
              "- Do not use quotation marks, formatting, or any explanation text. " .
              "Return only the final plain text heading."
          ),

          'category_section_subtitle' => $this->ai->generateText(
            "You are a skilled e-commerce copywriter. " .
              "Write an engaging subheading for the Product Categories section " .
              "of the website for {$businessName}, a {$industry} business. " .
              "Business details: {$businessInfo}. " .
              "Requirements: " .
              "- Use 6 to 8 words (maximum 60 characters, including spaces). " .
              "- Encourage customers to explore different product categories. " .
              "- Keep the tone friendly, inviting, and shopping-focused. " .
              "- Examples: Find exactly what you are looking for | Explore our wide range of products today. " .
              "- Use simple, clean language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
              "- Do not use quotation marks, formatting, or any explanation text. " .
              "Return only the final plain text subheading."
          ),
        ]
      );
    }

    // E-commerce Section Titles
    if (in_array($theme, ['home_eight'])) {
      $fields = array_merge(
        $fields,
        [
          'feature_item_title' => $this->ai->generateText(
            "You are a professional e-commerce copywriter. " .
              "Write a 2 or 3 word headline for the Featured Items or Featured Products section of {$businessName}, a {$industry} business. " .
              "Business details: {$businessInfo}. " .
              "Requirements: " .
              "- Maximum 25 characters including spaces. " .
              "- Make it attention-grabbing and premium-feeling. " .
              "- Good examples: Featured Items, Top Picks, Staff Favorites, Handpicked Selection. " .
              "- Use simple, clear English only, with no punctuation or special characters. " .
              "Return only the final plain text heading."
          ),

          'new_item_title' => $this->ai->generateText(
            "Act as an e-commerce product copywriter for {$businessName}, a {$industry} business. " .
              "Business details: {$businessInfo}. " .
              "Write a 2 or 3 word headline for a New Arrivals or Latest Products section. " .
              "Requirements: " .
              "- Maximum 25 characters including spaces. " .
              "- Communicate freshness and newness. " .
              "- Good examples: New Arrivals, Just Added, Fresh Stock, Latest Products. " .
              "- Use simple, clear English with no punctuation or special characters. " .
              "Return only the final plain text heading."
          ),

          'bestseller_item_title' => $this->ai->generateText(
            "You are an e-commerce marketing writer for {$businessName}, operating in the {$industry} industry. " .
              "Business details: {$businessInfo}. " .
              "Write a 2 or 3 word headline for a Bestsellers or Popular Products section. " .
              "Requirements: " .
              "- 25 characters max including spaces. " .
              "- Use strong social proof words. " .
              "- Good examples: Best Sellers, Top Rated, Customer Favorites, Most Popular. " .
              "- Use simple, clear words. No punctuation or special characters. " .
              "Return only the headline."
          ),
          'toprated_item_title' => $this->ai->generateText(
            "You are a professional e-commerce copywriter. " .
              "Write a short, clear heading for the Top Rated or Highly Rated Products section " .
              "of the website for {$businessName}, a {$industry} business. " .
              "Business details: {$businessInfo}. " .
              "Requirements: " .
              "- Use only 2 to 3 words (maximum 25 characters, including spaces). " .
              "- Emphasize quality, ratings, and customer satisfaction. " .
              "- Examples: Top Rated, Highest Rated, Best Reviews, Customer Choice. " .
              "- Use simple, clean language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
              "- Do not use quotation marks, formatting, or any explanation text. " .
              "Return only the final plain text heading."
          ),

          'special_item_title' => $this->ai->generateText(
            "You are a creative e-commerce copywriter for {$businessName}, a {$industry} business. " .
              "Business details: {$businessInfo}. " .
              "Write a 2 or 3 word section title for Special Offers or Exclusive Deals. " .
              "Requirements: " .
              "- 25 characters max including spaces. " .
              "- Make it sound exclusive or premium. " .
              "- Good examples: Special Offers, Exclusive Deals, Limited Edition, Premium Selection. " .
              "- No punctuation or special characters. " .
              "Return only the headline."
          ),

          'flashsale_item_title' => $this->ai->generateText(
            "You are an e-commerce copywriter for {$businessName} in the {$industry} industry. " .
              "Business details: {$businessInfo}. " .
              "Write a 2 or 3 word title for a Flash Sale or Limited Time Deals section. " .
              "Requirements: " .
              "- 25 characters max including spaces. " .
              "- Create a sense of urgency. " .
              "- Good examples: Flash Sale, Lightning Deals, Quick Deals, Time Limited. " .
              "- Do not use punctuation or special characters. " .
              "Return only the headline."
          ),
        ]
      );
    }

    if (in_array($theme, ['home_thirteen'])) {
      $fields = array_merge($fields, [
        'featured_section_title' => $this->ai->generateText(
          "You are a professional web copywriter. " .
            "Write a short, catchy main heading for the Featured Items or Featured Services section " .
            "of the website for {$businessName}, a {$industry} business. " .
            "Business details: {$businessInfo}. " .
            "Requirements: " .
            "- Use only 2 to 3 words (maximum 25 characters, including spaces). " .
            "- Make it clear, attention-grabbing, and highlight-focused. " .
            "- Examples: Featured Services, Top Picks, Our Highlights, Best Selections. " .
            "- Use simple, clean language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
            "- Do not use quotation marks, formatting, or any explanation text. " .
            "Return only the final plain text heading."
        ),
        'latest_item_section_title' => $this->ai->generateText(
          "You are a conversion-focused e-commerce copywriter for {$businessName} operating in {$industry}. " .
            "Business details: {$businessInfo}. " .
            "Write a 2 or 3 word section title for Latest Items or Recent Additions. " .
            "Requirements: " .
            "- 25 characters max including spaces. " .
            "- Clearly communicate recency and newness. " .
            "- Good examples: Latest Items, Recent Additions, New Stock, Fresh Picks. " .
            "- Use only clear English without punctuation or special characters. " .
            "Return only the headline."
        ),
        'featured_category_item_section_title' => $this->ai->generateText(
          "You are a professional e-commerce copywriter for {$businessName}, a {$industry} business. " .
            "Business details: {$businessInfo}. " .
            "Write a 2 to 4 word heading for a Featured Categories or Top Collections section. " .
            "Requirements: " .
            "- Maximum 30 characters including spaces. " .
            "- Highlight curated categories or collections. " .
            "- Good examples: Featured Categories, Top Collections, Popular Sections, Category Highlights. " .
            "- No punctuation or special characters allowed. " .
            "Return only the text."
        ),
        'causes_section_title' => $this->ai->generateText(
          "You are a professional nonprofit website copywriter. " .
            "Write a short, clear main heading for the Our Causes or Social Causes section " .
            "of the website for {$businessName}, a {$industry} organization. " .
            "Business details: {$businessInfo}. " .
            "Requirements: " .
            "- Use only 2 to 3 words (maximum 25 characters, including spaces). " .
            "- Make it compassionate, purposeful, and mission-focused. " .
            "- Examples: Our Causes, Making Impact, Help Communities, Support Change. " .
            "- Use simple, clear language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
            "- Do not use quotation marks, formatting, or any explanation text. " .
            "Return only the final plain text heading."
        ),
      ]);
    }

    // On Sale Section
    if (in_array($theme, ['home_fourteen'])) {
      $fields = array_merge($fields, [
        'flash_sale_title' => $this->ai->generateText(
          "You are an e-commerce copywriter for {$businessName}, a {$industry} business. " .
            "Business details: {$businessInfo}. " .
            "Write a 2 or 3 word alternative title for a Flash Sale section. " .
            "Requirements: " .
            "- Maximum 25 characters including spaces. " .
            "- Make it sound urgent and irresistible. " .
            "- Good examples: Hot Deals, Today Only, Deal Zone, Flash Offers. " .
            "- Use no punctuation or special symbols. " .
            "Return only the headline."
        ),

        'featured_item_section_title' => $this->ai->generateText(
          "You are a professional web copywriter. " .
            "Write a short, catchy main heading for the Featured Items or Featured Services section " .
            "of the website for {$businessName}, a {$industry} business. " .
            "Business details: {$businessInfo}. " .
            "Requirements: " .
            "- Use only 2 to 3 words (maximum 25 characters, including spaces). " .
            "- Make it clear, attention-grabbing, and highlight-focused. " .
            "- Examples: Featured Services, Top Picks, Our Highlights, Best Selections. " .
            "- Use simple, clean language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
            "- Do not use quotation marks, formatting, or any explanation text. " .
            "Return only the final plain text heading."
        ),
        'featured_category_item_section_title' => $this->ai->generateText(
          "You are a professional e-commerce copywriter for {$businessName}, a {$industry} business. " .
            "Business details: {$businessInfo}. " .
            "Write a 2 to 4 word heading for a Featured Categories or Top Collections section. " .
            "Requirements: " .
            "- Maximum 30 characters including spaces. " .
            "- Highlight curated categories or collections. " .
            "- Good examples: Featured Categories, Top Collections, Popular Sections, Category Highlights. " .
            "- No punctuation or special characters allowed. " .
            "Return only the text."
        ),

        'toprated_item_title' => $this->ai->generateText(
          "You are a professional e-commerce copywriter. " .
            "Write a short, clear heading for the Top Rated or Highly Rated Products section " .
            "of the website for {$businessName}, a {$industry} business. " .
            "Business details: {$businessInfo}. " .
            "Requirements: " .
            "- Use only 2 to 3 words (maximum 25 characters, including spaces). " .
            "- Emphasize quality, ratings, and customer satisfaction. " .
            "- Examples: Top Rated, Highest Rated, Best Reviews, Customer Choice. " .
            "- Use simple, clean language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
            "- Do not use quotation marks, formatting, or any explanation text. " .
            "Return only the final plain text heading."
        ),

        'counter_section_image' => $this->ai->generateImage(
          "statistics and achievements background, {$industry} success metrics visualization",
          1920,
          600,
          $this->imageStoragePath
        ),

        'on_sale_section_title' => $this->ai->generateText(
          "You are a professional e-commerce copywriter. " .
            "Write a short, attention-grabbing heading for the On Sale or Discount Products section " .
            "of the website for {$businessName}, a {$industry} business. " .
            "Business details: {$businessInfo}. " .
            "Requirements: " .
            "- Use only 2 to 3 words (maximum 25 characters, including spaces). " .
            "- Make it exciting and sale-focused. " .
            "- Examples: On Sale Now, Big Discounts, Save Today, Deal Zone. " .
            "- Use simple, clean language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
            "- Do not use quotation marks, formatting, or any explanation text. " .
            "Return only the final plain text heading."
        ),

        'on_sale_section_subtitle' => $this->ai->generateText(
          "You are a skilled e-commerce copywriter. " .
            "Write an engaging subheading for the On Sale section " .
            "of the website for {$businessName}, a {$industry} business. " .
            "Business details: {$businessInfo}. " .
            "Requirements: " .
            "- Use 6 to 8 words (maximum 60 characters, including spaces). " .
            "- Create urgency and highlight savings or value. " .
            "- Keep the tone exciting and action-oriented. " .
            "- Examples: Grab amazing deals before they are gone | Save big on selected items today only. " .
            "- Use simple, clean language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
            "- Do not use quotation marks, formatting, or any explanation text. " .
            "Return only the final plain text subheading."
        ),

        'on_sale_section_section_button_name' => 'Shop Now',
        'on_sale_section_section_button_link' => '/shop',

        'on_sale_section_image' => $this->ai->generateImage(
          "eye-catching on sale promotion banner for {$industry} products, vibrant discount offer design, sale badge and percentage symbols, modern e-commerce promotional banner style, exciting shopping deals theme, bold red and yellow accent colors, clearance sale atmosphere, professional retail marketing design",
          1200,
          600,
          $this->imageStoragePath
        ),

        'category_section_title' => $this->ai->generateText(
          "You are a professional e-commerce copywriter. " .
            "Write a short, clear main heading for the Product Categories or Browse Categories section " .
            "of the website for {$businessName}, a {$industry} business. " .
            "Business details: {$businessInfo}. " .
            "Requirements: " .
            "- Use only 2 to 3 words (maximum 25 characters, including spaces). " .
            "- Make it clear and easy to understand. " .
            "- Examples: Shop Categories, Browse Products, Our Collections, Product Range. " .
            "- Use simple, clean language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
            "- Do not use quotation marks, formatting, or any explanation text. " .
            "Return only the final plain text heading."
        ),
      ]);
    }


    // Featured Course Section 
    if (in_array($theme, ['home_ten'])) {

      $fields = array_merge(
        $fields,
        [
          'featured_course_section_title' => $this->ai->generateText(
            "You are a professional educational platform copywriter. " .
              "Write a short, clear main heading for the Featured Courses or Popular Courses section " .
              "of the website for {$businessName}, a {$industry} business. " .
              "Business details: {$businessInfo}. " .
              "Requirements: " .
              "- Use only 2 to 3 words (maximum 25 characters, including spaces). " .
              "- Make it clear, educational-focused, and appealing to learners. " .
              "- Examples: Featured Courses, Top Courses, Popular Learning, Best Classes. " .
              "- Use simple, clean language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
              "- Do not use quotation marks, formatting, or any explanation text. " .
              "Return only the final plain text heading."
          ),
          'category_section_title' => $this->ai->generateText(
            "You are a professional e-commerce copywriter. " .
              "Write a short, clear main heading for the Product Categories or Browse Categories section " .
              "of the website for {$businessName}, a {$industry} business. " .
              "Business details: {$businessInfo}. " .
              "Requirements: " .
              "- Use only 2 to 3 words (maximum 25 characters, including spaces). " .
              "- Make it clear and easy to understand. " .
              "- Examples: Shop Categories, Browse Products, Our Collections, Product Range. " .
              "- Use simple, clean language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
              "- Do not use quotation marks, formatting, or any explanation text. " .
              "Return only the final plain text heading."
          ),
        ]
      );
    }


    // Job Section
    if (in_array($theme, ['home_twelve'])) {
      $fields = array_merge(
        $fields,
        [
          'job_education_title' => $this->ai->generateText(
            "You are a professional career website copywriter. " .
              "Write a short, clear main heading for the Job Opportunities or Career Openings section " .
              "of the website for {$businessName}, a {$industry} business. " .
              "Business details: {$businessInfo}. " .
              "Requirements: " .
              "- Use only 2 to 3 words (maximum 25 characters, including spaces). " .
              "- Make it professional, inviting, and career-focused. " .
              "- Examples: Career Opportunities, Join Team, Open Positions, Work Here. " .
              "- Use simple, clear language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
              "- Do not use quotation marks, formatting, or any explanation text. " .
              "Return only the final plain text heading."
          ),

          'job_education_subtitle' => $this->ai->generateText(
            "You are a skilled HR and recruitment copywriter. " .
              "Write an engaging subheading for the Career Opportunities section of {$businessName}, " .
              "a {$industry} business. " .
              "Business details: {$businessInfo}. " .
              "Requirements: " .
              "- Use 7 to 9 words (maximum 70 characters, including spaces). " .
              "- Emphasize growth, opportunity, and company culture. " .
              "- Keep the tone professional, welcoming, and motivational. " .
              "- Examples: Build your future with our talented team | Explore exciting roles and advance your career. " .
              "- Use simple, clear language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
              "- Do not use quotation marks, formatting, or any explanation text. " .
              "Return only the final plain text subheading."
          ),
        ]
      );
    }

    // Rooms Section
    if (in_array($theme, ['home_nine'])) {
      $fields = array_merge(
        $fields,
        [
          'rooms_section_title' => $this->ai->generateText(
            "You are a professional hotel website copywriter. " .
              "Write a short, clear main heading for the Rooms or Accommodation section of the website for {$businessName}, a {$industry} business. " .
              "Business details: {$businessInfo}. " .
              "Requirements: " .
              "- Use only 2 to 3 words (maximum 25 characters, including spaces). " .
              "- Make it welcoming and easy to understand. " .
              "- Examples: Our Rooms, Room Types, Guest Rooms, Luxury Suites, Accommodation. " .
              "- Use simple, clean language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
              "- Do not use quotation marks, formatting, or any explanation text. " .
              "Return only the final plain text heading."
          ),

          'rooms_section_subtitle' => $this->ai->generateText(
            "You are a skilled hotel website copywriter. " .
              "Write an engaging subheading for the Rooms section of {$businessName}, a {$industry} business. " .
              "Business details: {$businessInfo}. " .
              "Requirements: " .
              "- Use 7 to 9 words (maximum 70 characters, including spaces). " .
              "- Emphasize comfort, amenities, and the unique features of the rooms. " .
              "- Keep the tone inviting, relaxing, and guest-focused. " .
              "- Examples: Experience comfort and luxury in every suite | Discover rooms designed for your relaxation | Enjoy modern amenities and stylish interiors. " .
              "- Use simple, clean language with no special characters, symbols, colons, commas, periods, hyphens, or other punctuation marks. " .
              "- Do not use quotation marks, formatting, or any explanation text. " .
              "Return only the final plain text subheading."
          ),

          'rooms_section_content' => $this->ai->generateText(
            "You are a skilled hotel website copywriter. " .
              "Write a concise and inviting paragraph for the Rooms section content of {$businessName}, a {$industry} business. " .
              "Business details: {$businessInfo}. " .
              "Requirements: " .
              "- Use 20 to 30 words (maximum 200 characters, including spaces). " .
              "- Describe the room options, mention comfort, amenities, and why guests will enjoy staying. " .
              "- Write in third person (use 'they' or 'the hotel name', not 'I' or 'we'). " .
              "- Keep the tone warm, relaxing, and professional. " .
              "- Do not include any headings, bullet points, quotes, or explanation text. " .
              "Return only the final paragraph text."
          ),
        ]
      );
    }

    return $fields;
  }

  private function extractCleanTitle($text)
  {
    // Remove common AI formatting patterns
    $text = preg_replace('/^(Here are|Options:|Choose from:).*/i', '', $text);
    $text = preg_replace('/^\*+\s*/', '', $text);
    $text = preg_replace('/\*+/', '', $text);
    $text = preg_replace('/__/', '', $text);
    $text = preg_replace('/^-\s*/', '', $text);
    $text = preg_replace('/\n.*$/s', '', $text);
    $text = preg_replace('/[*_#`~]/', '', $text);

    return trim($text);
  }
}
