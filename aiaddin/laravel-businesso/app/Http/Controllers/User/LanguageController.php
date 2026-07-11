<?php

namespace App\Http\Controllers\User;

use App\Constants\Constant;
use App\Models\User\Language;
use App\Models\Language as AdminLanguage;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Http\Controllers\User\CourseManagement\LessonContentController;
use App\Http\Helpers\Uploader;
use App\Http\Helpers\UserPermissionHelper;
use App\Models\Membership;
use App\Models\Package;
use App\Models\User\CourseManagement\LessonContent;
use App\Models\User\Menu;
use Exception;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Session;

class LanguageController extends Controller
{
    // public function index($lang = false)
    // {
    //     $data['languages'] = Language::where('user_id', Auth::guard('web')->user()->id)->get();
    //     return view('user.language.index', $data);
    // }

    public function index($lang = false)
    {

        $userId = Auth::guard('web')->user()->id;
        $languages = Language::where('user_id', $userId)->get();

        // Check if English language exists
        $englishLanguage = Language::where('user_id', $userId)
            ->where('code', 'en')
            ->first();

        if (!$englishLanguage) {
            $defaults = [
                'user_id' => $userId,
                'name' => 'English',
                'code' => 'en',
                'rtl' => 0,
                'keywords' => json_encode([])
            ];

            // Only set as defaults if no other languages exist
            $existingLanguages = Language::where('user_id', $userId)->count();
            if ($existingLanguages == 0) {
                $defaults['is_default'] = 1;
                $defaults['dashboard_default'] = 1;
            }

            Language::create($defaults);
        }

        $data['languages'] = $languages;
        return view('user.language.index', $data);
    }

    public function store(Request $request)
    {

        $userId = Auth::guard('web')->id();

        $membership = Membership::query()
            ->where('user_id', $userId)
            ->where('expire_date', '>=', now()->toDateString())
            ->where('status', '!=', 2)
            ->whereYear('start_date', '!=', '9999')
            ->latest()
            ->first();

        if (!$membership) {
            session()->flash('warning', __('No active membership found'));
            return 'success';
        }

        $package = Package::findOrFail($membership->package_id);

        // Calculate language counts efficiently
        $userLanguageCount = Language::where('user_id', $userId)->count();
        $adminLanguageCount = AdminLanguage::count();
        $totalLanguages = max(0, $userLanguageCount - $adminLanguageCount);

        // Check language limit and prepare message 
        if ($package->number_of_languages !== 0 && $totalLanguages >= $package->number_of_languages) {

            $message_1 = __("You can\'t add more languages") . '. ';
            $message_2 = __("Your package allows only additional") . ' ';
            $message = $message_1 . $message_2 . $package->number_of_languages . ' ' . __("languages") . '.';

            session()->flash('warning', $message);
            return 'success';
        }

        $rules = [
            'name' => 'required|max:255',
            'code' => [
                'required',
                function ($attribute, $value, $fail) {
                    $language = Language::where([
                        ['code', $value],
                        ['user_id', Auth::guard('web')->user()->id]
                    ])->get();
                    if ($language->count() > 0) {
                        $fail(':attribute' . ' ' . __('already taken'));
                    }
                },
            ],
            'direction' => 'required'
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }

        $deLang = Language::first();

        $in['name'] = $request->name;
        $in['code'] = $request->code;
        $in['rtl'] = $request->direction;
        $in['keywords'] = $deLang->keywords;
        $in['user_id'] = Auth::guard('web')->user()->id;
        if (Language::where([
            ['is_default', 1],
            ['user_id', Auth::guard('web')->user()->id]
        ])->count() > 0) {
            $in['is_default'] = 0;
        } else {
            $in['is_default'] = 1;
        }
        DB::beginTransaction();
        try {
            $language = Language::create($in);
            Menu::create([
                'user_id' => Auth::guard('web')->user()->id,
                'language_id' => $language->id,
                'menus' => '[{"text":"Home","href":"","icon":"empty","target":"_self","title":"","type":"home"},{"type":"services","text":"Services","href":"","target":"_self"},{"type":"team","text":"Team","href":"","target":"_self"},{"text":"Blog","href":"","icon":"empty","target":"_self","title":"","type":"blog"},{"text":"Contact","href":"","icon":"empty","target":"_self","title":"","type":"contact"}]',
            ]);
            DB::commit();
        } catch (Exception $e) {
            DB::rollback();
            return response()->json(['error', $e->getMessage(), $language->id], 401);
        }

        Session::flash('success', __('Language added successfully') . '!');
        return "success";
    }

    public function edit($id)
    {
        if ($id > 0) {
            $data['language'] = Language::where('user_id', Auth::guard('web')->user()->id)->where('id', $id)->firstOrFail();
        }
        $data['id'] = $id;
        return view('user.language.edit', $data);
    }


    public function update(Request $request)
    {
        $language = Language::where('user_id', Auth::guard('web')->user()->id)->where('id', $request->language_id)->firstOrFail();
        $rules = [
            'name' => 'required|max:255',
            'code' => [
                'required',
                function ($attribute, $value, $fail) use ($request) {
                    $language = Language::where([
                        ['code', $value],
                        ['user_id', Auth::guard('web')->user()->id],
                        ['id', '<>', $request->language_id]
                    ])->get();
                    if ($language->count() > 0) {
                        $fail(':attribute' . ' ' . __('already taken'));
                    }
                },
            ],
            'direction' => 'required'
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }

        $language->name = $request->name;
        $language->code = $request->code;
        $language->rtl = $request->direction;
        $language->user_id = Auth::guard('web')->user()->id;
        $language->save();

        Session::flash('success', __('Language updated successfully') . '!');
        return "success";
    }

    public function editKeyword($id)
    {

        $data['la'] = Language::where('user_id', Auth::guard('web')->user()->id)->where('id', $id)->firstOrFail();

        $data['languageKeywords'] = json_decode($data['la']->keywords, true);
        return view('user.language.edit-keyword', $data);
    }

    public function updateKeyword(Request $request, $id)
    {

        $lang = Language::where('user_id', Auth::guard('web')->user()->id)->where('id', $id)->firstOrFail();
        $keywords = $request->except('_token');
        $lang->keywords = json_encode($keywords);
        $lang->save();

        return back()->with('success', __('Updated Successfully') . '!');
    }


    public function delete($id)
    {
        $la = Language::where('user_id', Auth::guard('web')->user()->id)->where('id', $id)->firstOrFail();

        if ($la->is_default == 1) {
            return back()->with('warning', __('Default language cannot be deleted!'));
        }
        if (session()->get('user_lang') == $la->code) {
            session()->forget('user_lang');
        }
        if ($la->testimonials()->count() > 0) {
            $testimonials = $la->testimonials()->get();
            foreach ($testimonials as $key => $tstm) {
                @unlink(public_path('assets/front/img/user/testimonials/' . $tstm->image));
                $tstm->delete();
            }
        }
        // ========================= course information delete start ===============================
        // course categories delete
        if ($la->courseCategory()->count() > 0) {
            $la->courseCategory()->delete();
        }
        // course faqs delete
        if ($la->courseFaqs()->count() > 0) {
            $la->courseFaqs()->delete();
        }

        // course information delete
        if ($la->courseInformation()->count() > 0) {
            $la->courseInformation()->delete();
        }
        // course information delete
        if ($la->courseInstructtors()->count() > 0) {
            $instructors = $la->courseInstructtors()->get();
            foreach ($instructors as $key => $ins) {
                @unlink(public_path(Constant::WEBSITE_INSTRUCTOR_IMAGE . '/' . $ins->image));
                $ins->socialPlatform()->delete();
                $ins->delete();
            }
        }

        // course lesson delete
        if ($la->courseLessons()->count() > 0) {
            $lessons = $la->courseLessons()->get();
            foreach ($lessons as $leson) {
                //  lesson content delete
                $contents = $leson->content()->get();
                if (count($contents) > 0) {
                    foreach ($contents as $cont) {
                        $content = LessonContent::where('user_id', Auth::guard('web')->user()->id)->find($cont->id);
                        $lessonId = $content->lesson_id;
                        $type = $content->type;
                        if (!is_null($content->video_unique_name)) Uploader::remove(Constant::WEBSITE_LESSON_CONTENT_VIDEO, $content->video_unique_name);
                        if (!is_null($content->file_unique_name)) Uploader::remove(Constant::WEBSITE_LESSON_CONTENT_FILE, $content->file_unique_name);
                        $content->delete();
                    }
                }
                $quiz = $leson->quiz()->get();
                if (count($quiz) > 0) {
                    foreach ($quiz as $q) {

                        $q->delete();
                    }
                }

                $leson->lesson_complete()->delete();
                $leson->lessonContentComplete()->delete();
            }
            $la->courseLessons()->delete();
        }



        // course module delete
        if ($la->courseModules()->count() > 0) {
            $la->courseModules()->delete();
        }
        // ========================= course information delete end ===============================

        // ========================= room information delete start ===============================
        // room amenities delete
        if ($la->roomAmenities()->count() > 0) {
            $la->roomAmenities()->delete();
        }

        // room categories delete
        if ($la->roomCategories()->count() > 0) {
            $la->roomCategories()->delete();
        }

        // room content delete
        if ($la->roomDetails()->count() > 0) {
            $la->roomDetails()->delete();
        }
        // ========================= room information delete end ===============================

        // ========================= cause/donation information delete start ===============================
        // cause content delete
        if ($la->causeContents()->count() > 0) {
            $la->causeContents()->delete();
        }
        // cause categories delete
        if ($la->causeCategories()->count() > 0) {
            $categories = $la->causeCategories()->get();
            foreach ($categories as $key => $cate) {
                @unlink(public_path(Constant::WEBSITE_CAUSE_CATEGORY_IMAGE . '/' . $cate->image));
                $cate->delete();
            }
        }
        // ========================= cause/donation information delete end ===============================
        // variation delete
        if ($la->variations()->count() > 0) {
            $la->variations()->delete();
        }
        // user_item_contacts delete
        if ($la->user_item_contacts()->count() > 0) {
            $la->user_item_contacts()->delete();
        }

        if ($la->skills()->count() > 0) {
            $la->skills()->delete();
        }

        if ($la->menus()->count() > 0) {
            $la->menus()->delete();
        }

        if ($la->pages()->count() > 0) {
            $la->pages()->delete();
        }

        if ($la->services()->count() > 0) {
            $services = $la->services()->get();
            foreach ($services as $key => $service) {
                @unlink(public_path('assets/front/img/user/services/' . $service->image));
                $service->delete();
            }
        }

        if ($la->seos()->count() > 0) {
            $la->seos()->delete();
        }

        if ($la->achievements()->count() > 0) {
            $la->achievements()->delete();
        }

        if ($la->portfolios()->count() > 0) {
            $portfolios = $la->portfolios()->get();
            foreach ($portfolios as $key => $portfolio) {
                @unlink(public_path('assets/front/img/user/portfolios/' . $portfolio->image));
                if ($portfolio->portfolio_images()->count() > 0) {
                    foreach ($portfolio->portfolio_images as $key => $pi) {
                        @unlink(public_path('assets/front/img/user/portfolios/' . $pi->image));
                        $pi->delete();
                    }
                }
                $portfolio->delete();
            }
        }

        if ($la->portfolio_categories()->count() > 0) {
            $la->portfolio_categories()->delete();
        }

        if ($la->home_page_texts()->count() > 0) {
            $homeTexts = $la->home_page_texts()->get();
            foreach ($homeTexts as $key => $homeText) {
                @unlink(public_path('assets/front/img/user/home_settings/' . $homeText->about_image));
                @unlink(public_path('assets/front/img/user/home_settings/' . $homeText->about_video_image));
                @unlink(public_path('assets/front/img/user/home_settings/' . $homeText->testimonial_image));
                @unlink(public_path('assets/front/img/user/home_settings/' . $homeText->video_section_image));
                @unlink(public_path('assets/front/img/user/home_settings/' . $homeText->why_choose_us_section_image));
                @unlink(public_path('assets/front/img/user/home_settings/' . $homeText->why_choose_us_section_video_image));
                @unlink(public_path('assets/front/img/work_process/' . $homeText->work_process_section_img));
                @unlink(public_path('assets/front/img/work_process/' . $homeText->work_process_section_video_img));
                @unlink(public_path('assets/front/img/user/home_settings/' . $homeText->quote_section_image));
                $homeText->delete();
            }
        }

        if ($la->jobs()->count() > 0) {
            $la->jobs()->delete();
        }

        if ($la->jcategories()->count() > 0) {
            $la->jcategories()->delete();
        }

        if ($la->teams()->count() > 0) {
            $teams = $la->teams()->get();
            foreach ($teams as $key => $team) {
                @unlink(public_path('/assets/front/img/user/team/' . $team->image));
                $team->delete();
            }
        }

        if ($la->quote_inputs()->count() > 0) {
            $quote_inputs = $la->quote_inputs()->get();
            foreach ($quote_inputs as $key => $input) {
                if ($input->quote_input_options()->count() > 0) {
                    $input->quote_input_options()->delete();
                }
                $input->delete();
            }
        }

        if ($la->processes()->count() > 0) {
            $la->processes()->delete();
        }

        if ($la->blog_categories()->count() > 0) {
            $la->blog_categories()->delete();
        }


        if ($la->blogs()->count() > 0) {
            $blogs = $la->blogs()->get();
            foreach ($blogs as $key => $blog) {
                @unlink(public_path('assets/front/img/user/blogs/' . $blog->image));
                $blog->delete();
            }
        }

        if ($la->faqs()->count() > 0) {
            $la->faqs()->delete();
        }

        if ($la->quick_links()->count() > 0) {
            $la->quick_links()->delete();
        }

        if ($la->footer_texts()->count() > 0) {
            $la->footer_texts()->delete();
        }


        if ($la->hero_static()->count() > 0) {
            $static = $la->hero_static;
            @unlink(public_path('assets/front/img/hero_static/' . $static->img));
            $static->delete();
        }

        if ($la->hero_sliders()->count() > 0) {
            $sliders = $la->hero_sliders()->get();
            foreach ($sliders as $key => $slider) {
                @unlink(public_path('assets/front/img/hero_slider/' . $slider->img));
                $slider->delete();
            }
        }

        //
        if ($la->itemInfo()->count() > 0) {
            $la->itemInfo()->delete();
        }
        if ($la->user_item_categories()->count() > 0) {
            $la->user_item_categories()->delete();
        }
        if ($la->user_item_subcategories()->count() > 0) {
            $la->user_item_subcategories()->delete();
        }
        if ($la->user_features()->count() > 0) {
            $user_features = $la->user_features()->get();
            foreach ($user_features as $key => $feat) {
                @unlink(public_path('assets/front/img/user/feature/' . $feat->icon));
                $feat->delete();
            }
        }
        if ($la->user_offer_banners()->count() > 0) {
            $user_offer_banners = $la->user_offer_banners()->get();
            foreach ($user_offer_banners as $key => $banner) {
                @unlink(public_path('assets/front/img/user/offers/' . $banner->image));
                $banner->delete();
            }
        }
        if ($la->user_shipping_charges()->count() > 0) {
            $la->user_shipping_charges()->delete();
        }

        // if the the deletable language is the currently selected language in frontend then forget the selected language from session
        session()->forget('lang');
        $la->delete();
        return back()->with('success', __('Language Delete Successfully') . '!');
    }


    public function default(Request $request, $id)
    {
        Language::where('is_default', 1)->where('user_id', Auth::guard('web')->user()->id)->update(['is_default' => 0]);
        $lang = Language::find($id);
        $lang->is_default = 1;
        $lang->save();
        return back()->with('success', $lang->name .  ' ' . __('language is set as default') . '.');
    }

    public function dashboardDefault(Request $request, $id)
    {

        $user_id = Auth::guard('web')->user()->id;
        $lang = Language::where('user_id', $user_id)->findOrFail($id);

        Language::where('dashboard_default', 1)
            ->where('user_id', $user_id)
            ->update(['dashboard_default' => 0]);

        $lang->dashboard_default = 1;
        $lang->save();

        // Update session and cookie immediately
        $code = trim('user_' . $lang->code);
        Session::put('user_dashboard_lang', $code);
        Session::put('dashboard_direction', $lang->rtl);
        app()->setLocale('user_' . $lang->code);

        // Set cookie for future visits (30 days expiration)
        Cookie::queue('userDashboardLang', $lang->code, 60 * 24 * 30);

        // return back()->with('success', $lang->name . ' ' . __('language is set as default') . '.');
        // Redirect to the languages page with the new language code in the URL
        return redirect()->route('user.language.index', ['language' => $lang->code])
            ->with('success', $lang->name . ' ' . __('language is set as default'));
    }

    public function rtlcheck($langid)
    {
        if ($langid > 0) {
            $lang = Language::where('user_id', Auth::guard('web')->user()->id)->where('id', $langid)->firstOrFail();
        } else {
            return 0;
        }
        return $lang->rtl;
    }
}
