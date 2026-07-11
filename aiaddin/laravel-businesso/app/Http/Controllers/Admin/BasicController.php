<?php

namespace App\Http\Controllers\Admin;

// use Artisan;
use Purifier;
use Validator;
use App\Models\Seo;
use App\Models\Language;
use App\Models\Timezone;
use App\Models\BasicSetting;
use Illuminate\Http\Request;
use App\Models\BasicExtended;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Session;
use App\Http\Helpers\EnvHelper;
use Illuminate\Support\Facades\Artisan;

class BasicController extends Controller
{
    public function __construct()
    {
        $abs = BasicSetting::first();
        Config::set('app.timezone', $abs->timezone);
    }

    public function setLocaleAdmin(Request $request)
    {
        Session::put('admin_lang', 'admin_' . $request->code);
        app()->setLocale('admin_' . $request->code);
        return $request->code;
    }

    public function favicon(Request $request)
    {
        return view('admin.basic.favicon');
    }

    public function updatefav(Request $request)
    {
        $img = $request->file('favicon');
        $allowedExts = ['jpg', 'png', 'jpeg', 'ico'];

        $rules = [
            'favicon' => [
                function ($attribute, $value, $fail) use ($img, $allowedExts) {
                    if (!empty($img)) {
                        $ext = $img->getClientOriginalExtension();
                        if (!in_array($ext, $allowedExts)) {
                            return $fail('Only png, jpg, jpeg image is allowed');
                        }
                    }
                },
            ],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $validator->getMessageBag()->add('error', 'true');
            return response()->json(['errors' => $validator->errors(), 'id' => 'favicon']);
        }

        if ($request->hasFile('favicon')) {
            $filename = uniqid() . '.' . $img->getClientOriginalExtension();
            $img->move(public_path('assets/front/img/'), $filename);

            $bss = BasicSetting::all();

            foreach ($bss as $key => $bs) {
                @unlink(public_path('assets/front/img/' . $bs->favicon));
                $bs->favicon = $filename;
                $bs->save();
            }
        }
        Session::flash('success', __('Favicon update successfully!'));
        return back();
    }

    public function logo(Request $request)
    {
        return view('admin.basic.logo');
    }

    public function updatelogo(Request $request)
    {
        $img = $request->file('file');
        $allowedExts = ['jpg', 'png', 'jpeg'];

        $rules = [
            'file' => [
                function ($attribute, $value, $fail) use ($img, $allowedExts) {
                    if (!empty($img)) {
                        $ext = $img->getClientOriginalExtension();
                        if (!in_array($ext, $allowedExts)) {
                            return $fail(__('Only png, jpg, jpeg image is allowed'));
                        }
                    }
                },
            ],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $validator->getMessageBag()->add('error', 'true');
            return response()->json(['errors' => $validator->errors(), 'id' => 'logo']);
        }

        if ($request->hasFile('file')) {
            $bss = BasicSetting::all();

            $filename = uniqid() . '.' . $img->getClientOriginalExtension();
            $img->move(public_path('assets/front/img/'), $filename);

            foreach ($bss as $key => $bs) {
                // only remove the the previous image, if it is not the same as default image or the first image is being updated
                @unlink(public_path('assets/front/img/' . $bs->logo));
                $bs->logo = $filename;
                $bs->save();
            }
        }
        Session::flash('success', __('Logo update successfully!'));
        return back();
    }

    public function preloader(Request $request)
    {
        return view('admin.basic.preloader');
    }

    public function updatepreloader(Request $request)
    {
        $img = $request->file('file');
        $allowedExts = ['jpg', 'png', 'jpeg', 'gif'];

        $rules = [
            'preloader_status' => 'required',
            'file' => [
                function ($attribute, $value, $fail) use ($img, $allowedExts) {
                    if (!empty($img)) {
                        $ext = $img->getClientOriginalExtension();
                        if (!in_array($ext, $allowedExts)) {
                            return $fail('Only gif, png, jpg, jpeg image is allowed');
                        }
                    }
                },
            ],
        ];

        $request->validate($rules);

        $bss = BasicSetting::all();

        if ($request->hasFile('file')) {
            $filename = uniqid() . '.' . $img->getClientOriginalExtension();
            $img->move(public_path('assets/front/img/'), $filename);
        }

        foreach ($bss as $key => $bs) {
            $bs->preloader_status = $request->preloader_status;
            if ($request->hasFile('file')) {
                @unlink(public_path('assets/front/img/' . $bs->preloader));
                $bs->preloader = $filename;
            }
            $bs->save();
        }
        Session::flash('success', __('Preloader updated successfully!'));
        return back();
    }

    public function basicinfo()
    {
        $data['abs'] = BasicSetting::firstOrFail();
        $data['abe'] = BasicExtended::firstOrFail();

        $data['timezones'] = Timezone::all();
        return view('admin.basic.basicinfo', $data);
    }

    public function updatebasicinfo(Request $request)
    {
        $request->validate([
            'website_title' => 'required',
            'timezone' => 'required',
            'base_color' => 'required',
            'base_currency_symbol' => 'required',
            'base_currency_symbol_position' => 'required',
            'base_currency_text' => 'required',
            'base_currency_text_position' => 'required',
            'base_currency_rate' => 'required|numeric',
        ]);

        $bss = BasicSetting::all();
        foreach ($bss as $key => $bs) {
            $bs->website_title = $request->website_title;
            $bs->timezone = $request->timezone;
            $bs->email_verification_status = $request->email_verification_status;
            $bs->base_color = str_replace('#', '', $request->base_color);
            $bs->save();
        }

        $bes = BasicExtended::all();
        foreach ($bes as $key => $be) {
            $be->base_currency_symbol = $request->base_currency_symbol;
            $be->base_currency_symbol_position = $request->base_currency_symbol_position;
            $be->base_currency_text = $request->base_currency_text;
            $be->base_currency_text_position = $request->base_currency_text_position;
            $be->base_currency_rate = $request->base_currency_rate;
            $be->timezone = $request->timezone;
            $be->save();
        }
        // set timezone in .env
        if ($request->has('timezone') && $request->filled('timezone')) {
            $arr = ['TIMEZONE' => $request->timezone];
            setEnvironmentValue($arr);
            \Artisan::call('config:clear');
        }
        Session::flash('success', __('Basic informations updated successfully!'));
        return back();
    }

    public function updateslider(Request $request, $lang)
    {
        $be = BasicExtended::where('language_id', $lang)->firstOrFail();

        if ($request->hasFile('slider_shape_img')) {
            @unlink(public_path('assets/front/img/' . $be->slider_shape_img));
            $filename = uniqid() . '.' . $request->slider_shape_img->getClientOriginalExtension();
            $request->slider_shape_img->move(public_path('assets/front/img/'), $filename);
            $be->slider_shape_img = $filename;
        }

        if ($request->hasFile('slider_bottom_img')) {
            @unlink(public_path('assets/front/img/' . $be->slider_bottom_img));
            $filename = uniqid() . '.' . $request->slider_bottom_img->getClientOriginalExtension();
            $request->slider_bottom_img->move(public_path('assets/front/img/'), $filename);
            $be->slider_bottom_img = $filename;
        }

        $be->save();
        Session::flash('success', __('Slider data updated successfully!'));
        return back();
    }

    public function script()
    {
        $data = BasicSetting::first();
        return view('admin.basic.scripts', ['data' => $data]);
    }

    public function updatescript(Request $request)
    {
        $bss = BasicSetting::all();

        foreach ($bss as $bs) {
            $bs->tawkto_property_id = $request->tawkto_property_id;
            $bs->is_tawkto = $request->is_tawkto;

            $bs->is_disqus = $request->is_disqus;
            // $bs->is_user_disqus = $request->is_user_disqus;
            $bs->disqus_shortname = $request->disqus_shortname;

            $bs->is_recaptcha = $request->is_recaptcha;
            $bs->google_recaptcha_site_key = $request->google_recaptcha_site_key;
            $bs->google_recaptcha_secret_key = $request->google_recaptcha_secret_key;

            $bs->is_whatsapp = $request->is_whatsapp;
            $bs->whatsapp_number = $request->whatsapp_number;
            $bs->whatsapp_header_title = $request->whatsapp_header_title;
            $bs->whatsapp_popup_message = Purifier::clean($request->whatsapp_popup_message);
            $bs->whatsapp_popup = $request->whatsapp_popup;

            // ================= AI CONFIG =================

            // ---- OpenAI ----
            $bs->openai_api_key = trim($request->openai_api_key ?? '');
            $bs->openai_text_model = trim($request->openai_text_model ?? 'gpt-4o');
            $bs->openai_image_model = trim($request->openai_image_model ?? 'dall-e-3');
            $bs->openai_content_type = $request->openai_content_type ?? 'all';

            // ---- Gemini ----
            $bs->gemini_api_key = trim($request->gemini_api_key ?? '');
            $bs->gemini_text_model = trim($request->gemini_text_model ?? 'gemini-2.0-flash');
            $bs->gemini_image_model = trim($request->gemini_image_model ?? 'imagen-4.0-generat-001');
            $bs->gemini_content_type = $request->gemini_content_type ?? 'all';

            // ---- Pollinations ----
 
            $bs->pollinations_content_type = $request->pollinations_content_type ?? 'all';

            // ENV update (API Keys)
            EnvHelper::setEnvValue('OPENAI_API_KEY', $bs->openai_api_key);
            EnvHelper::setEnvValue('GEMINI_API_KEY', $bs->gemini_api_key);

            $bs->save();
        }
        Artisan::call('optimize:clear');
        Artisan::call('config:clear');
        Artisan::call('cache:clear');

        Session::flash('success', __('Plugins updated successfully!'));
        return back();
    }

    public function maintainance()
    {
        $data = BasicSetting::select('maintainance_mode', 'maintenance_img', 'maintenance_status', 'maintainance_text', 'secret_path')->first();
        return view('admin.basic.maintainance', ['data' => $data]);
    }

    public function updatemaintainance(Request $request)
    {
        $img = $request->file('file');
        $allowedExts = ['jpg', 'png', 'jpeg'];

        $rules = [
            'file' => [
                function ($attribute, $value, $fail) use ($img, $allowedExts) {
                    if (!empty($img)) {
                        $ext = $img->getClientOriginalExtension();
                        if (!in_array($ext, $allowedExts)) {
                            return $fail('Only png, jpg, jpeg image is allowed');
                        }
                    }
                },
            ],
            'maintenance_status' => 'required',
            'maintainance_text' => 'required',
        ];

        $message = [
            'maintainance_text.required' => 'The maintenance message field is required.',
        ];

        $validator = Validator::make($request->all(), $rules, $message);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator);
        }

        $bs = BasicSetting::first();

        // first, get the maintenance image from db
        if ($request->hasFile('file')) {
            $filename = uniqid() . '.' . $request->file('file')->getClientOriginalExtension();

            @unlink(public_path('assets/front/img/' . $bs->maintenance_img));
            $request->file('file')->move(public_path('assets/front/img/'), $filename);
        }

        $down = 'down';
        if ($request->filled('secret_path')) {
            $down .= ' --secret=' . $request->secret_path;
        }

        if ($request->maintenance_status == 1) {
            @unlink('core/storage/framework/down');
            Artisan::call($down);
        } else {
            Artisan::call('up');
        }

        $bs->update([
            'maintenance_img' => $request->hasFile('file') ? $filename : $bs->maintenance_img,
            'maintenance_status' => $request->maintenance_status,
            'maintainance_text' => clean($request->maintainance_text),
            'secret_path' => $request->secret_path,
        ]);

        Session::flash('success', __('Maintenance Info updated successfully!'));

        return redirect()->back();
    }

    public function css(Request $request)
    {
        $data['abe'] = BasicExtended::select('custom_css')->first();

        return view('admin.basic.css', $data);
    }

    public function updateCss(Request $request)
    {
        $css = clean($request->custom_css);
        $datas = BasicExtended::all();
        foreach ($datas as $key => $data) {
            $data->custom_css = $css;
            $data->save();
        }

        Session::flash('success', __('Custom CSS updated successfully') . '!');
        return back();
    }

    public function js(Request $request)
    {
        $data['abe'] = BasicExtended::select('custom_js')->first();

        return view('admin.basic.js', $data);
    }

    public function updateJs(Request $request)
    {
        $js = clean($request->custom_js);
        $datas = BasicExtended::all();
        foreach ($datas as $key => $data) {
            $data->custom_js = $js;
            $data->save();
        }

        Session::flash('success', __('Custom JS updated successfully') . '!');
        return back();
    }

    public function sections(Request $request)
    {
        $data['abs'] = BasicSetting::first();

        return view('admin.home.sections', $data);
    }

    public function updatesections(Request $request)
    {
        $bss = BasicSetting::all();
        foreach ($bss as $key => $bs) {
            $bs->update($request->all());
        }

        Session::flash('success', __('Sections customized successfully!'));
        return back();
    }

    public function cookiealert(Request $request)
    {
        $lang = Language::where('code', $request->language)->firstOrFail();
        $data['lang_id'] = $lang->id;
        $data['abe'] = $lang->basic_extended;

        return view('admin.basic.cookie', $data);
    }

    public function updatecookie(Request $request, $langid)
    {
        $request->validate([
            'cookie_alert_status' => 'required',
            'cookie_alert_text' => 'required',
            'cookie_alert_button_text' => 'required|max:25',
        ]);

        $be = BasicExtended::where('language_id', $langid)->firstOrFail();
        $be->cookie_alert_status = $request->cookie_alert_status;
        $be->cookie_alert_text = Purifier::clean($request->cookie_alert_text);
        $be->cookie_alert_button_text = $request->cookie_alert_button_text;
        $be->save();

        Session::flash('success', __('Cookie alert updated successfully!'));
        return back();
    }

    public function seo(Request $request)
    {
        // first, get the language info from db
        $language = Language::where('code', $request->language)->firstOrFail();
        $langId = $language->id;

        // then, get the seo info of that language from db
        $seo = Seo::where('language_id', $langId);

        if ($seo->count() == 0) {
            // if seo info of that language does not exist then create a new one
            Seo::create(
                $request->except('language_id') + [
                    'language_id' => $langId,
                ],
            );
        }

        $information['language'] = $language;

        // then, get the seo info of that language from db
        $information['data'] = $seo->first();

        // get all the languages from db
        $information['langs'] = Language::all();

        return view('admin.basic.seo', $information);
    }

    public function updateSEO(Request $request)
    {
        // first, get the language info from db
        $langCode = str_replace('admin_', '', session('admin_lang'));
        if($langCode){
            $language = Language::where('code', $langCode)->first();
        }
        else{
            $language = Language::where('is_default', 1)->first();
        }
        $langId = $language->id;

        // then, get the seo info of that language from db
        $seo = SEO::where('language_id', $langId)->first();

        // else update the existing seo info of that language
        $seo->update($request->all());

        $request->session()->flash('success', __('SEO Informations updated successfully!'));

        return redirect()->back();
    }
}
