<?php

namespace App\Http\Controllers\User;

// use Response;
use App\Models\Timezone;
use App\Models\User\SEO;
use App\Models\User\Member;
use Illuminate\Http\Request;
use App\Models\User\Language;
use App\Http\Helpers\Uploader;
use App\Models\User\HomeSection;
use App\Models\User\WorkProcess;
use App\Models\User\BasicSetting;
use App\Models\BasicSetting as AdminBasicSetting;
use App\Models\User\HomePageText;
use Illuminate\Support\Facades\DB;
use Mews\Purifier\Facades\Purifier;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Session;
use App\Models\Language as AdminLanguage;
use Illuminate\Support\Facades\Validator;
use App\Http\Helpers\UserPermissionHelper;
use App\Services\MasterAiGenerator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Response;
use App\Jobs\GenerateFullWebsiteJob;
use App\Http\Helpers\AiPageFilterHelper;
use App\Http\Helpers\AiAccessHelper;
use App\Models\AiGenerationLog;

class BasicController extends Controller
{

    public function themeVersion()
    {
        $data = BasicSetting::where('user_id', Auth::guard('web')->user()->id)->first();
        return view('user.settings.themes', ['data' => $data]);
    }

    public function updateThemeVersion(Request $request)
    {

        $userId = Auth::guard('web')->user()->id;
        $package = UserPermissionHelper::currentPackagePermission($userId);

        $rules = [
            'theme' => 'required'
        ];

        $generateAi = $request->filled('generate_ai_content') && $request->generate_ai_content == 1;

        // If AI generation is selected to make these fields required
        if ($generateAi) {
            $rules['business_name']   = 'required|string|max:255';
            $rules['industry_type']   = 'required|string|max:255';
            $rules['business_info']   = 'required|string';
            $rules['delete_prev_theme_data'] = 'required|in:0,1';
        }

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return Response::json([
                'errors' => $validator->getMessageBag()->toArray()
            ], 400);
        }

        $data = BasicSetting::where('user_id', Auth::guard('web')->user()->id)->first();
        $data->theme = $request->theme;
        $data->save();

        // Only call AI generator if user chose to generate with AI
        if ($generateAi) {

            //  AI permission & limit check
            $access = AiAccessHelper::canGenerate($userId, $package);

            if (!$access['allowed']) {
                $request->session()->flash('warning', $access['message']);
                return 'warning';
            }

            // AI Engine package
            $aiEngine = !empty($package->ai_engine) ? trim($package->ai_engine) : 'pollinations';

            // Filter request pages based on package allowed AI pages
            $packageAiPages = json_decode($package->ai_pages ?? '[]', true);
            $filteredPages = AiPageFilterHelper::filter(
                $request->pages ?? [],
                $packageAiPages
            );

            $isDeleteOldRecords = $request->boolean('delete_prev_theme_data');

            // payload array
            $payload = [
                'user_id' => $userId,
                'theme' => trim($request->theme),
                'business_name' => trim($request->business_name),
                'industry' => trim($request->industry_type),
                'business_info' => trim($request->business_info),
                'pages' => $filteredPages,
                'ai_engine' => $aiEngine,
                'delete_old_records' => $isDeleteOldRecords,
            ];

            $aiService = new MasterAiGenerator();
            $aiService->generateFullWebsite($payload);

            // Log usage AFTER success
            AiGenerationLog::create([
                'user_id' => $userId,
                'package_id' => $package->id,
                'ai_engine' => $aiEngine
            ]);

            session([
                'ai_generating' => [
                    'user_id' => $userId,
                    'started_at' => now()->timestamp
                ]
            ]);
        }

        $request->session()->flash('success', __('Theme updated successfully') . '!');

        return 'success';
    }

    public function favicon(Request $request)
    {
        $data['basic_setting'] = BasicSetting::where('user_id', Auth::guard('web')->user()->id)->first();
        return view('user.settings.favicon', $data);
    }
    public function generalSettings()
    {

        $data['timezones'] = Timezone::all();
        $data['adminlangs'] = AdminLanguage::all();
        $data['data'] = BasicSetting::where('user_id', Auth::guard('web')->user()->id)
            ->first();
        return view('user.settings.general-settings', $data);
    }

    public function updateInfo(Request $request)
    {
        $user = Auth::guard('web')->user();
        $package = UserPermissionHelper::currentPackagePermission($user->id);
        if (!empty($user)) {
            $permissions = UserPermissionHelper::packagePermission($user->id);
            $permissions = json_decode($permissions, true);
        }

        $rules = [];
        $rules['website_title'] = 'required';
        $rules['timezone'] = 'required';
        $rules['dashboard_language'] = 'required';

        if (!empty($permissions) && in_array('Ecommerce', $permissions)) {
            $rules['base_currency_symbol'] = 'required';
            $rules['base_currency_symbol_position'] = 'required';
            $rules['base_currency_text'] = 'required';
            $rules['base_currency_text_position'] = 'required';
            $rules['base_currency_rate'] = 'required|numeric|min:0.00000001';
        }

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }

        BasicSetting::where('user_id', Auth::guard('web')->user()->id)->update([
            'website_title' => $request->website_title,
            'timezone' => $request->timezone,
            'email_verification_status' => $request->email_verification_status,
            'dashboard_language' => $request->dashboard_language,
            'base_currency_symbol' => $request->base_currency_symbol,
            'base_currency_symbol_position' => $request->base_currency_symbol_position,
            'base_currency_text' => $request->base_currency_text,
            'base_currency_text_position' => $request->base_currency_text_position,
            'base_currency_rate' => $request->base_currency_rate,
        ]);

        $request->session()->flash('success', __('Information updated successfully') . '!');

        return 'success';
    }

    public function updatefav(Request $request)
    {
        $img = $request->file('favicon');
        $allowedExts = array('jpg', 'png', 'jpeg', 'ico');

        $rules = [
            'favicon' => [
                function ($attribute, $value, $fail) use ($img, $allowedExts) {
                    if (!empty($img)) {
                        $ext = $img->getClientOriginalExtension();
                        if (!in_array($ext, $allowedExts)) {
                            return $fail(__('Only png, jpg, jpeg, ico image is allowed') . ".");
                        }
                    }
                },
            ],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $validator->getMessageBag()->add('error', 'true');
            return response()->json([
                'errors' => $validator->errors(),
                'id' => 'favicon',
                'error' => true
            ]);
        }

        if ($request->hasFile('favicon')) {
            $filename = uniqid() . '.' . $img->getClientOriginalExtension();
            $img->move(public_path('assets/front/img/user/'), $filename);
            $bss = BasicSetting::where('user_id', Auth::guard('web')->user()->id)->first();
            if (!is_null($bss)) {
                if ($bss->favicon) {
                    @unlink(public_path('assets/front/img/user/' . $bss->favicon));
                }
                $bss->favicon = $filename;
                $bss->user_id = Auth::guard('web')->user()->id;
                $bss->save();
            } else {
                $bs = new BasicSetting();
                $bs->favicon = $filename;
                $bs->user_id = Auth::guard('web')->user()->id;
                $bs->save();
            }
        }
        Session::flash('success', __('Favicon update successfully') . '.');
        return "success";
    }

    public function logo(Request $request)
    {
        $data['basic_setting'] = BasicSetting::where('user_id', Auth::guard('web')->user()->id)->first();
        return view('user.settings.logo', $data);
    }

    public function updatelogo(Request $request)
    {
        $img = $request->file('file');
        $allowedExts = array('jpg', 'png', 'jpeg');

        $rules = [
            'file' => [
                function ($attribute, $value, $fail) use ($img, $allowedExts) {
                    if (!empty($img)) {
                        $ext = $img->getClientOriginalExtension();
                        if (!in_array($ext, $allowedExts)) {
                            return $fail(__('Only png, jpg, jpeg image is allowed') . ".");
                        }
                    }
                },
            ],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $validator->getMessageBag()->add('error', 'true');
            return response()->json([
                'errors' => $validator->errors(),
                'id' => 'logo',
                'error' => true
            ]);
        }

        if ($request->hasFile('file')) {
            $bss = BasicSetting::where('user_id', Auth::guard('web')->user()->id)->first();
            $filename = uniqid() . '.' . $img->getClientOriginalExtension();
            $img->move(public_path('assets/front/img/user/'), $filename);
            $bss = BasicSetting::where('user_id', Auth::guard('web')->user()->id)->first();
            if (!is_null($bss)) {
                if ($bss->logo) {
                    @unlink(public_path('assets/front/img/user/' . $bss->logo));
                }
                $bss->logo = $filename;
                $bss->user_id = Auth::guard('web')->user()->id;
                $bss->save();
            } else {
                $bs = new BasicSetting();
                $bs->logo = $filename;
                $bs->user_id = Auth::guard('web')->user()->id;
                $bs->save();
            }
        }
        Session::flash('success', __('Logo update successfully') . '.');
        return "success";
    }

    public function breadcrumb(Request $request)
    {
        $data['basic_setting'] = BasicSetting::where('user_id', Auth::guard('web')->user()->id)->first();
        return view('user.settings.breadcrumb', $data);
    }

    public function updateBreadcrumb(Request $request)
    {
        $img = $request->file('breadcrumb');
        $allowedExts = array('jpg', 'png', 'jpeg');

        $rules = [
            'breadcrumb' => [
                function ($attribute, $value, $fail) use ($img, $allowedExts) {
                    if (!empty($img)) {
                        $ext = $img->getClientOriginalExtension();
                        if (!in_array($ext, $allowedExts)) {
                            return $fail(__('Only png, jpg, jpeg image is allowed') . ".");
                        }
                    }
                },
            ],
        ];

        $validator = Validator::make($request->all(), $rules);
        // Check if validation fails
        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        if ($request->hasFile('breadcrumb')) {
            $filename = uniqid() . '.' . $img->getClientOriginalExtension();
            $img->move(public_path('assets/front/img/user/'), $filename);
            $bss = BasicSetting::where('user_id', Auth::guard('web')->user()->id)->first();
            if (!is_null($bss)) {
                if ($bss->favicon) {
                    @unlink(public_path('assets/front/img/user/' . $bss->breadcrumb));
                }
                $bss->breadcrumb = $filename;
                $bss->user_id = Auth::guard('web')->user()->id;
                $bss->save();
            } else {
                $bs = new BasicSetting();
                $bs->breadcrumb = $filename;
                $bs->user_id = Auth::guard('web')->user()->id;
                $bs->save();
            }
        }
        Session::flash('success', __('Breadcrumb update successfully') . '.');
        return back();
    }

    public function preloader(Request $request)
    {
        $data['basic_setting'] = BasicSetting::where('user_id', Auth::guard('web')->user()->id)->first();
        return view('user.settings.preloader', $data);
    }

    public function updatepreloader(Request $request)
    {
        $img = $request->file('file');
        $allowedExts = array('jpg', 'png', 'jpeg', 'gif');

        $rules = [
            'file' => [
                function ($attribute, $value, $fail) use ($img, $allowedExts) {
                    if (!empty($img)) {
                        $ext = $img->getClientOriginalExtension();
                        if (!in_array($ext, $allowedExts)) {
                            return $fail(__('Only png, jpg, jpeg, gif image is allowed') . ".");
                        }
                    }
                },
            ],
        ];

        $validator = Validator::make($request->all(), $rules);
        // Check if validation fails
        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        if ($request->hasFile('file')) {
            $bss = BasicSetting::where('user_id', Auth::guard('web')->user()->id)->first();
            $filename = uniqid() . '.' . $img->getClientOriginalExtension();
            $img->move(public_path('assets/front/img/user/'), $filename);
            $bss = BasicSetting::where('user_id', Auth::guard('web')->user()->id)->first();
            if (!is_null($bss)) {
                @unlink(public_path('assets/front/img/user/' . $bss->preloader));
                $bss->preloader = $filename;
                $bss->user_id = Auth::guard('web')->user()->id;
                $bss->save();
            } else {
                $bs = new BasicSetting();
                $bs->preloader = $filename;
                $bs->user_id = Auth::guard('web')->user()->id;
                $bs->save();
            }
        }

        Session::flash('success', __('Preloader updated successfully') . '.');
        return back();
    }

    public function homePageTextEdit(Request $request)
    {
        $user = Auth::guard('web')->user();

        if (!$user) {
            return redirect()->back()->with('error', __('User not authenticated. Please log in') . '.');
        }

        $language = Language::where('code', $request->language)
            ->where('user_id', $user->id)
            ->firstorFail();

        $text = HomePageText::where('user_id', $user->id)->where('language_id', $language->id);
        if ($text->count() == 0) {
            $text = new HomePageText;
            $text->language_id = $language->id;
            $text->user_id = Auth::guard('web')->user()->id;
            $text->save();
        } else {
            $text = $text->first();
        }

        $data['home_setting'] = $text;

        return view('user.home.edit', $data);
    }

    public function homePageTextUpdate(Request $request)
    {

        $homeText = HomePageText::query()->where('language_id', $request->language_id)->where('user_id', Auth::guard('web')->user()->id)->firstOrFail();
        foreach ($request->types as $key => $type) {
            if (
                $type == 'faq_section_image' || $type == 'testimonial_image' || $type == 'newsletter_image' || $type == 'newsletter_snd_image' || $type == 'about_video_image' || $type == 'counter_section_image' || $type == 'contact_section_image' || $type == 'on_sale_section_image'
            ) {
                continue;
            }
            $homeText->$type = Purifier::clean($request[$type]);
        }

        if ($request->hasFile('skills_image')) {

            $skillsImage = uniqid() . '.' . $request->file('skills_image')->getClientOriginalExtension();
            $request->file('skills_image')->move(public_path('assets/front/img/user/home_settings/'), $skillsImage);
            @unlink(public_path('assets/front/img/user/home_settings/' . $homeText->skills_image));
            $homeText->skills_image = $skillsImage;
        }
        if ($request->hasFile('newsletter_image')) {
            $newsletterImage = uniqid() . '.' . $request->file('newsletter_image')->getClientOriginalExtension();
            $request->file('newsletter_image')->move(public_path('assets/front/img/user/home_settings/'), $newsletterImage);
            @unlink(public_path('assets/front/img/user/home_settings/' . $homeText->newsletter_image));
            $homeText->newsletter_image = $newsletterImage;
        }
        if ($request->hasFile('newsletter_snd_image')) {
            $newsletterImage2 = uniqid() . '.' . $request->file('newsletter_snd_image')->getClientOriginalExtension();
            $request->file('newsletter_snd_image')->move(public_path('assets/front/img/user/home_settings/'), $newsletterImage2);
            @unlink(public_path('assets/front/img/user/home_settings/' . $homeText->newsletter_snd_image));
            $homeText->newsletter_snd_image = $newsletterImage2;
        }
        if ($request->hasFile('testimonial_image')) {
            $testimonialImage = uniqid() . '.' . $request->file('testimonial_image')->getClientOriginalExtension();
            $request->file('testimonial_image')->move(public_path('assets/front/img/user/home_settings/'), $testimonialImage);
            @unlink(public_path('assets/front/img/user/home_settings/' . $homeText->testimonial_image));
            $homeText->testimonial_image = $testimonialImage;
        }
        if ($request->hasFile('about_video_image')) {
            $aboutVideoImage = uniqid() . '.' . $request->file('about_video_image')->getClientOriginalExtension();
            $request->file('about_video_image')->move(public_path('assets/front/img/user/home_settings/'), $aboutVideoImage);
            @unlink(public_path('assets/front/img/user/home_settings/' . $homeText->about_video_image));
            $homeText->about_video_image = $aboutVideoImage;
        }
        if ($request->hasFile('faq_section_image')) {
            $faqSectionImage = uniqid() . '.' . $request->file('faq_section_image')->getClientOriginalExtension();
            $request->file('faq_section_image')->move(public_path('assets/front/img/user/home_settings/'), $faqSectionImage);
            @unlink(public_path('assets/front/img/user/home_settings/' . $homeText->faq_section_image));
            $homeText->faq_section_image = $faqSectionImage;
        }
        if ($request->hasFile('counter_section_image')) {
            $counterSectionImg = uniqid() . '.' . $request->file('counter_section_image')->getClientOriginalExtension();
            $request->file('counter_section_image')->move(public_path('assets/front/img/user/home_settings/'), $counterSectionImg);
            @unlink(public_path('assets/front/img/user/home_settings/' . $homeText->counter_section_image));
            $homeText->counter_section_image = $counterSectionImg;
        }
        if ($request->hasFile('on_sale_section_image')) {
            $onSaleSectionImage = uniqid() . '.' . $request->file('on_sale_section_image')->getClientOriginalExtension();
            $request->file('on_sale_section_image')->move(public_path('assets/front/img/user/home_settings/'), $onSaleSectionImage);
            @unlink(public_path('assets/front/img/user/home_settings/' . $homeText->on_sale_section_image));
            $homeText->on_sale_section_image = $onSaleSectionImage;
        }
        if ($request->hasFile('contact_section_image')) {
            $contactSecImage = uniqid() . '.' . $request->file('contact_section_image')->getClientOriginalExtension();
            $request->file('contact_section_image')->move(public_path('assets/front/img/user/home_settings/'), $contactSecImage);
            @unlink(public_path('assets/front/img/user/home_settings/' . $homeText->contact_section_image));
            $homeText->contact_section_image = $contactSecImage;
        }
        $homeText->user_id = Auth::guard('web')->user()->id;
        $homeText->language_id = $request->language_id;
        $homeText->save();
        Session::flash('success', __('Home page text updated successfully') . '.');
        return "success";
    }

    public function seo(Request $request)
    {
        // first, get the language info from db
        $language = Language::where('code', $request->language)->where('user_id', Auth::guard('web')->user()->id)->firstOrFail();
        $langId = $language->id;

        // then, get the seo info of that language from db
        $seo = SEO::where('language_id', $langId)->where('user_id', Auth::guard('web')->user()->id);

        if ($seo->count() == 0) {
            // if seo info of that language does not exist then create a new one
            SEO::create($request->except('language_id', 'user_id') + [
                'language_id' => $langId,
                'user_id' => Auth::guard('web')->user()->id
            ]);
        }

        $information['language'] = $language;

        // then, get the seo info of that language from db
        $information['data'] = $seo->first();

        // get all the languages from db
        $information['langs'] = Language::where('user_id', Auth::guard('web')->user()->id)->get();

        return view('user.settings.seo', $information);
    }

    public function updateSEO(Request $request)
    {
        $user = Auth::guard('web')->user();

        if (!$user) {
            return redirect()->back()->with('error', __('User not authenticated. Please log in') . '.');
        }

        // first, get the language info from db
        $language = Language::where('code', '=', $request->language)
            ->where('user_id', $user->id)
            ->first();
        $langId = $language->id;

        // then, get the seo info of that language from db
        $seo = SEO::where('language_id', $langId)
            ->where('user_id', $user->id)
            ->first();

        // else update the existing seo info of that language
        $seo->update($request->all());

        $request->session()->flash('success', __('SEO Informations updated successfully') . '!');

        return redirect()->back();
    }
    public function cookieAlert(Request $request)
    {
        $userId = Auth::guard('web')->user()->id;
        $data['abe'] = BasicSetting::where('user_id', $userId)->first();
        return view('user.settings.cookie', $data);
    }

    public function updatecookie(Request $request)
    {
        $userId = Auth::guard('web')->user()->id;
        $request->validate([
            'cookie_alert_status' => 'required',
            'cookie_alert_text' => 'required',
            'cookie_alert_button_text' => 'required|max:25',
        ]);

        $be = BasicSetting::query()
            ->where('user_id', $userId)
            ->first();
        $be->cookie_alert_status = $request->cookie_alert_status;
        $be->cookie_alert_text = Purifier::clean($request->cookie_alert_text, 'youtube');
        $be->cookie_alert_button_text = $request->cookie_alert_button_text;
        $be->save();

        Session::flash('success', __('Cookie alert updated successfully') . '!');
        return back();
    }
    public function teamSection(Request $request)
    {
        // first, get the language info from db
        $language = Language::where('code', $request->language)->where('user_id', Auth::guard('web')->user()->id)->first();
        $information['language'] = $language;

        // then, get the testimonial section heading info of that language from db
        $information['data'] = HomePageText::where('language_id', $language->id)->where('user_id', Auth::guard('web')->user()->id)->first();

        // also, get the testimonials of that language from db
        $information['memberInfos'] = Member::where('language_id', $language->id)
            ->where('user_id', Auth::guard('web')->user()->id)
            ->orderby('id', 'desc')
            ->get();

        // get all the languages from db
        $information['langs'] = Language::where('code', $request->language)->where('user_id', Auth::guard('web')->user()->id)->get();

        return view('user.team_section.index', $information);
    }
    public function updateTeamSection(Request $request)
    {
        $lang = Language::where('code', $request->language)->where('user_id', Auth::guard('web')->user()->id)->first();
        $data = HomePageText::where('language_id', $lang->id)->where('user_id', Auth::guard('web')->user()->id)->first();
        $data->team_section_title = $request->team_section_title;
        $data->team_section_subtitle = $request->team_section_subtitle;
        $data->save();
        $request->session()->flash('success', __('Team section updated successfully') . '!');
        return redirect()->back();
    }

    public function homePageAbout(Request $request)
    {
        $language = Language::where('user_id', Auth::guard('web')->user()->id)->where('code', $request->language)->firstOrFail();
        $text = HomePageText::where('user_id', Auth::guard('web')->user()->id)->where('language_id', $language->id);
        if ($text->count() == 0) {
            $text = new HomePageText;
            $text->language_id = $language->id;
            $text->user_id = Auth::guard('web')->user()->id;
            $text->save();
        } else {
            $text = $text->first();
        }

        $data['home_setting'] = $text;
        return view('user.about-section', $data);
    }

    public function homePageAboutUpdate(Request $request)
    {

        $rules = [
            'about_button_text' => 'nullable|max:50',
            'about_snd_button_text' => 'nullable|max:50',
            'about_button_url' => 'nullable|max:255',
            'about_snd_button_url' => 'nullable|max:255',
        ];

        $request->validate($rules);
        $homeText = HomePageText::query()->where('language_id', $request->language_id)->where('user_id', Auth::guard('web')->user()->id)->firstOrFail();
        foreach ($request->types as $key => $type) {
            if ($type == 'about_image' || $type == 'about_video_url' || $type == 'about_video_image') {
                continue;
            }
            $homeText->$type = Purifier::clean($request[$type]);
        }
        if ($request->hasFile('about_image')) {
            $aboutImage = uniqid() . '.' . $request->file('about_image')->getClientOriginalExtension();
            $request->file('about_image')->move(public_path('assets/front/img/user/home_settings/'), $aboutImage);
            @unlink(public_path('assets/front/img/user/home_settings/' . $homeText->about_image));
            $homeText->about_image = $aboutImage;
        }
        if ($request->hasFile('about_video_image')) {
            $aboutVidImg = uniqid() . '.' . $request->file('about_video_image')->getClientOriginalExtension();
            $request->file('about_video_image')->move(public_path('assets/front/img/user/home_settings/'), $aboutVidImg);
            @unlink(public_path('assets/front/img/user/home_settings/' . $homeText->about_video_image));
            $homeText->about_video_image = $aboutVidImg;
        }
        if ($request->filled('about_video_url')) {
            $videoLink = $request->about_video_url;
            if (strpos($videoLink, "&") != false) {
                $videoLink = substr($videoLink, 0, strpos($videoLink, "&"));
            }
        } else {
            $videoLink = NULL;
        }
        $homeText->about_video_url = $videoLink;
        $homeText->user_id = Auth::guard('web')->user()->id;
        $homeText->language_id = $request->language_id;
        $homeText->save();
        Session::flash('success', __('About section updated successfully') . '.');
        return "success";
    }

    public function homePageVideo(Request $request)
    {
        $language = Language::where([
            ['code', $request->language],
            ['user_id', Auth::id()]
        ])->firstorFail();

        // then, get the testimonial section heading info of that language from db
        $information['data'] = HomePageText::where('language_id', $language->id)->where('user_id', Auth::guard('web')->user()->id)->first();
        return view('user.home.video-section', $information);
    }

    public function homePageUpdateVideo(Request $request)
    {
        $lang = Language::where('code', '=', $request->language)
            ->where('user_id', Auth::guard('web')->user()->id)
            ->first();

        $data = HomePageText::where('language_id', $lang->id)->where('user_id', Auth::guard('web')->user()->id)->first();

        if (empty($data)) {
            $data = HomePageText::create([
                'language_id' => $lang->id,
                'user_id' => Auth::guard('web')->user()->id
            ]);
        }

        if (empty($data->video_section_image) && !$request->hasFile('video_section_image')) {
            $rules = [
                'video_section_image' => 'required|mimes:jpeg,jpg,png|max:1000',
            ];
            $request->validate($rules);
        }

        $request['image_name'] = $data->video_section_image;
        if ($request->hasFile('video_section_image')) {
            $request['image_name'] = Uploader::update_picture('assets/front/img/user/home_settings/', $request->file('video_section_image'), $data->video_section_image);
        }
        $videoLink = $request->video_section_url;
        if (strpos($videoLink, "&") != false) {
            $videoLink = substr($videoLink, 0, strpos($videoLink, "&"));
            $request['video_section_url'] = $videoLink;
        }
        $data->update($request->except(['video_section_image', 'video_section_text']) + [
            'video_section_image' => $request->image_name,
            'video_section_text' => clean($request->video_section_text),
        ]);
        $request->session()->flash('success', __('Video section updated successfully') . '!');
        return redirect()->back();
    }
    public function whyChooseUsSection(Request $request)
    {
        // first, get the language info from db
        $language = Language::where('code', $request->language)->where('user_id', Auth::guard('web')->user()->id)->firstorFail();
        // then, get the blog section heading info of that language from db
        $information['data'] = HomePageText::where('language_id', $language->id)->first();

        $userBs = BasicSetting::where('user_id', Auth::guard('web')->user()->id)->select('theme')->first();
        if ($userBs->theme == 'home_one' || $userBs->theme == 'home_three' || $userBs->theme == 'home_nine') {
            $information['chooseUsItems'] = DB::table('user_choose_us_items')->where('user_id', Auth::guard('web')->user()->id)->where('language_id', $language->id)->orderBy('serial_number')->get();
        }

        return view("user.home.why-choose-us-section", $information);
    }

    public function updateWhyChooseUsSection(Request $request, $language)
    {
        $rules = [
            'why_choose_us_section_title' => 'nullable|max:255',
            'why_choose_us_section_subtitle' => 'nullable|max:255',
            'why_choose_us_section_text' => 'nullable',
            'why_choose_us_section_button_text' => 'nullable|max:255',
            'why_choose_us_section_button_url' => 'nullable|max:255'
        ];

        $lang = Language::where('code', $language)->where('user_id', Auth::guard('web')->user()->id)->first();
        $userBs = BasicSetting::where('user_id', Auth::guard('web')->user()->id)->first();
        $data = HomePageText::where('language_id', $lang->id)->where('user_id', Auth::guard('web')->user()->id)->first();
        $request['video_image_name'] = $data->why_choose_us_section_video_image;
        $request['image_name'] = $data->why_choose_us_section_image;

        if (empty($data->why_choose_us_section_image) && !$request->hasFile('why_choose_us_section_image')) {
            $rules['why_choose_us_section_image'] = 'nullable|mimes:jpeg,jpg,png';
        }
        if (empty($data->why_choose_us_section_video_image) && !$request->hasFile('why_choose_us_section_video_image') && $userBs->theme === 'home_three') {
            $rules['why_choose_us_section_video_image'] = 'nullable|mimes:jpeg,jpg,png';
        }

        if ($request->hasFile('why_choose_us_section_image')) {
            $request['image_name'] = Uploader::update_picture('assets/front/img/user/home_settings/', $request->file('why_choose_us_section_image'), $data->why_choose_us_section_image);
        }
        if ($userBs->theme === 'home_three') {
            $rules['why_choose_us_section_video_url'] = 'nullable';
            if ($request->hasFile('why_choose_us_section_video_image')) {
                $request['video_image_name'] = Uploader::update_picture('assets/front/img/user/home_settings/', $request->file('why_choose_us_section_video_image'), $data->why_choose_us_section_video_image);
            }
        }
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator);
        }
        $data->update($request->except(['why_choose_us_section_image', 'why_choose_us_section_text', 'why_choose_us_section_video_image', 'why_choose_us_section_video_url']) + [
            'why_choose_us_section_image' => $request->image_name,
            'why_choose_us_section_video_image' => $request->video_image_name,
            'why_choose_us_section_text' => clean($request->why_choose_us_section_text),
            'why_choose_us_section_video_url' => (strpos($request->why_choose_us_section_video_url, "&") != false) ? substr($request->why_choose_us_section_video_url, 0, strpos($request->why_choose_us_section_video_url, "&")) : $request->why_choose_us_section_video_url,
        ]);
        $request->session()->flash('success', __('Why choose us section updated successfully') . '!');
        return redirect()->back();
    }
    public function whyChooseUsItemStore(Request $request)
    {
        $request->validate([
            'user_language_id' => 'required',
            'icon' => 'required',
            'title' => 'required',
            'content' => 'required',
            'serial_number' => 'required'
        ]);

        try {
            DB::table('user_choose_us_items')->insert($request->except('_token', 'user_language_id') + [
                'user_id' => Auth::guard('web')->user()->id,
                'language_id' => $request->user_language_id,
            ]);
            session()->flash('success', __('Why choose us item store successfully') . '!');
            // return response()->json(['status' => 'success'], 200);
            return 'success';
        } catch (\Exception $e) {
            session()->flash('warning', $e->getMessage());
            return 'success';
        }
    }

    public function whyChooseUsItemUpdate(Request $request)
    {
        $rules = [
            'icon' => 'required',
            'title' => 'required',
            'content' => 'required',
            'serial_number' => 'required|integer',
        ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            $errors = $validator->errors()->toArray();
            $response = ['error' => true];
            foreach ($errors as $field => $messages) {
                $response[$field] = $messages;
            }
            return response()->json($response);
        }

        try {
            DB::table('user_choose_us_items')->where('id', $request->id)->update($request->except('_token', 'id') + [
                'user_id' => Auth::guard('web')->user()->id
            ]);
            session()->flash('success', __('Why choose us item update successfully') . '!');
            return 'success';
        } catch (\Exception $e) {
            session()->flash('warning', $e->getMessage());
            return redirect()->back();
        }
    }
    public function whyChooseUsItemDelete(Request $request)
    {
        DB::table('user_choose_us_items')->where('id', $request->id)->delete();
        session()->flash('success', __('Why choose us item Delete successfully') . '!');
        return redirect()->back();
        // return 'success';
    }
    public function sections(Request $request)
    {
        $data['sections'] = HomeSection::where('user_id', Auth::guard('web')->user()->id)->first();

        return view('user.home.sections', $data);
    }

    public function updateSection(Request $request)
    {
        $fields = $request->except('_token');
        $sections = HomeSection::where('user_id', Auth::guard('web')->user()->id)->first();
        if (is_null($sections)) {
            $sections = new HomeSection;
            $sections->user_id = Auth::guard('web')->user()->id;
        }

        foreach ($fields as $key => $value) {
            if ($request->has("$key")) {
                $sections["$key"] = $value;
            }
        }
        $sections->save();

        Session::flash('success', __('Sections customized successfully') . '!');
        return back();
    }

    public function workProcessSection(Request $request)
    {

        $user = Auth::guard('web')->user();
        if (!$user) {
            return redirect()->back()->with('error', __('User not authenticated. Please log in') . '.');
        }

        // first, get the language info from db
        $language = Language::where('code', $request->language)
            ->where('user_id', $user->id)
            ->first();

        // then, get the blog section heading info of that language from db
        $information['data'] = HomePageText::where('language_id', $language->id)
            ->where('user_id', $user->id)
            ->first();

        $information['workProcessInfos'] = WorkProcess::where('language_id', $language->id)->orderby('id', 'desc')->get();

        $information['language'] = $language;

        return view('user.home.work-process-section.index', $information);
    }

    public function updateWorkProcessSection(Request $request)
    {
        $request->validate([
            'work_process_section_title' => 'nullable|max:255',
            'work_process_section_subtitle' => 'nullable|max:255',
            'work_process_section_text' => 'nullable',
        ]);

        $lang = Language::where('code', $request->language)->where('user_id', Auth::guard('web')->user()->id)->first();
        $data = HomePageText::where('language_id', $lang->id)->where('user_id', Auth::guard('web')->user()->id)->first();
        if (empty($data)) {
            $data = new HomePageText;
        }
        $userBs = BasicSetting::where('user_id', Auth::guard('web')->user()->id)->first();

        if ($userBs->theme === 'home_two' || $userBs->theme === 'home_four' || $userBs->theme === 'home_five' || $userBs->theme === 'home_six') {
            if (empty($data->work_process_section_img) && !$request->hasFile('work_process_section_img')) {
                $request->validate(
                    ['work_process_section_img' => 'nullable|mimes:jpeg,jpg,png|max:1000']
                );
            }
            if (empty($data->work_process_section_video_img) && !$request->hasFile('work_process_section_video_img')) {
                $request->validate(
                    ['work_process_section_video_img' => 'nullable|mimes:jpeg,jpg,png|max:1000']
                );
            }
            if (!$request->hasFile('work_process_section_img')) {
                $request['image_name'] = $data->work_process_section_img;
            }
            if (!$request->hasFile('work_process_section_video_img')) {
                $request['video_image_name'] = $data->work_process_section_video_img ?? null;
            }
            if ($request->hasFile('work_process_section_img')) {
                $request['image_name'] = Uploader::update_picture('assets/front/img/work_process/', $request->file('work_process_section_img'), $data->work_process_section_img ?? '');
            }
            if ($request->hasFile('work_process_section_video_img')) {
                $request['video_image_name'] = Uploader::update_picture('assets/front/img/work_process/', $request->file('work_process_section_video_img'), $data->work_process_section_video_img);
            }
            $data->work_process_section_img = $request->image_name;
            $data->work_process_section_video_img = $request->video_image_name;
            $data->work_process_section_video_url = $request->work_process_section_video_url;
            $data->user_id = Auth::guard('web')->user()->id;
            $data->language_id = $lang->id;
            $data->save();
        }
        $videoLink = $request->work_process_section_video_url;
        if (!empty($videoLink) && (strpos($videoLink, "&") != false)) {
            $videoLink = substr($videoLink, 0, strpos($videoLink, "&"));
        }
        $data->update($request->except(['work_process_section_text', 'work_process_section_img', 'work_process_section_video_img', 'work_process_section_video_url']) + [
            'work_process_section_text' => clean($request->work_process_section_text),
            'work_process_section_video_url' => $videoLink
        ]);
        $request->session()->flash('success', __('Work process section updated successfully') . '!');
        return redirect()->back();
    }

    public function plugins()
    {
        $data = BasicSetting::where('user_id', Auth::guard('web')->user()->id)
            ->select('is_recaptcha', 'google_recaptcha_site_key', 'google_recaptcha_secret_key', 'whatsapp_status', 'whatsapp_number', 'whatsapp_header_title', 'whatsapp_popup_status', 'whatsapp_popup_message', 'analytics_status', 'measurement_id', 'disqus_status', 'disqus_short_name', 'pixel_status', 'pixel_id', 'tawkto_status', 'tawkto_direct_chat_link')
            ->first();
        return view('user.settings.plugins', compact('data'));
    }

    public function updateRecaptcha(Request $request)
    {

        $rules = [
            'is_recaptcha' => 'required',
            'google_recaptcha_site_key' => 'required',
            'google_recaptcha_secret_key' => 'required'
        ];

        $request->validate($rules);

        BasicSetting::where('user_id', Auth::guard('web')->user()->id)->update(
            [
                'is_recaptcha' => $request->is_recaptcha,
                'google_recaptcha_site_key' => $request->google_recaptcha_site_key,
                'google_recaptcha_secret_key' => $request->google_recaptcha_secret_key,
            ]
        );

        $request->session()->flash('success', __('Recaptcha info updated successfully') . '!');

        return back();
    }


    public function updateAnalytics(Request $request)
    {
        $rules = [
            'analytics_status' => 'required',
            'measurement_id' => 'required'
        ];

        $request->validate($rules);

        BasicSetting::where('user_id', Auth::guard('web')->user()->id)->update(
            [
                'analytics_status' => $request->analytics_status,
                'measurement_id' => $request->measurement_id
            ]
        );

        $request->session()->flash('success', __('Analytics info updated successfully') . '!');

        return back();
    }

    public function updateWhatsApp(Request $request)
    {
        $rules = [
            'whatsapp_status' => 'required',
            'whatsapp_number' => 'required',
            'whatsapp_header_title' => 'required',
            'whatsapp_popup_status' => 'required',
            'whatsapp_popup_message' => 'required'
        ];

        $request->validate($rules);

        BasicSetting::where('user_id', Auth::guard('web')->user()->id)->update(
            [
                'whatsapp_status' => $request->whatsapp_status,
                'whatsapp_number' => $request->whatsapp_number,
                'whatsapp_header_title' => $request->whatsapp_header_title,
                'whatsapp_popup_status' => $request->whatsapp_popup_status,
                'whatsapp_popup_message' => clean($request->whatsapp_popup_message)
            ]
        );

        $request->session()->flash('success', __('WhatsApp info updated successfully') . '!');

        return back();
    }

    public function updateDisqus(Request $request)
    {
        $rules = [
            'disqus_status' => 'required',
            'disqus_short_name' => 'required'
        ];

        $request->validate($rules);

        BasicSetting::where('user_id', Auth::guard('web')->user()->id)->update(
            [
                'disqus_status' => $request->disqus_status,
                'disqus_short_name' => $request->disqus_short_name
            ]
        );

        $request->session()->flash('success', __('Disqus info updated successfully') . '!');

        return back();
    }

    public function updatePixel(Request $request)
    {
        $rules = [
            'pixel_status' => 'required',
            'pixel_id' => 'required'
        ];

        $request->validate($rules);

        BasicSetting::where('user_id', Auth::guard('web')->user()->id)->update(
            [
                'pixel_status' => $request->pixel_status,
                'pixel_id' => $request->pixel_id
            ]
        );

        $request->session()->flash('success', __('Facebook Pixel info updated successfully') . '!');

        return back();
    }

    public function updateTawkto(Request $request)
    {
        $rules = [
            'tawkto_status' => 'required',
            'tawkto_direct_chat_link' => 'required'
        ];

        $request->validate($rules);

        BasicSetting::where('user_id', Auth::guard('web')->user()->id)->update(
            [
                'tawkto_status' => $request->tawkto_status,
                'tawkto_direct_chat_link' => $request->tawkto_direct_chat_link
            ]
        );

        $request->session()->flash('success', __('Tawk.to info updated successfully') . '!');

        return back();
    }

    public function cvUpload()
    {
        $data['basic_setting'] = BasicSetting::where('user_id', Auth::id())->first();
        return view('user.cv', $data);
    }
    public function updateCV(Request $request)
    {

        $request->validate([
            'cv'  => "required|file|mimes:pdf|max:10000"
        ]);

        $file = $request->file('cv');
        if ($request->hasFile('cv')) {
            $filename = uniqid() . '.' . $file->getClientOriginalExtension();
            $file->move(public_path('assets/front/img/user/cv/'), $filename);
            $bss = BasicSetting::where('user_id', Auth::guard('web')->user()->id)->first();
            if (!is_null($bss)) {
                if ($bss->favicon) {
                    @unlink(public_path('assets/front/img/user/cv/' . $bss->cv));
                }
                $bss->cv_original = $file->getClientOriginalName();
                $bss->cv = $filename;
                $bss->save();
            } else {
                $bs = new BasicSetting();
                $bs->cv_original = $file->getClientOriginalName();
                $bs->cv = $filename;
                $bs->user_id = Auth::guard('web')->user()->id;
                $bs->save();
            }
        }
        Session::flash('success',  __('Updated successfully') . '!');
        return redirect()->back();
    }

    public function deleteCV()
    {
        $bs = BasicSetting::where('user_id', Auth::id())->first();
        @unlink(public_path('assets/front/img/user/cv/' . $bs->cv));
        $bs->cv = NULL;
        $bs->cv_original = NULL;
        $bs->save();

        Session::flash('success',  __('Deleted successfully') . '!');
        return back();
    }
}
