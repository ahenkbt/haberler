<?php

namespace App\Http\Controllers\Front;

use Validator;
use Carbon\Carbon;
use App\Models\Faq;
use App\Models\Seo;
use App\Models\Blog;
use App\Models\Page;
use App\Models\User;
use App\Models\Feature;
use App\Models\Package;
use App\Models\Partner;
use App\Models\Process;
use App\Models\Language;
use App\Models\Bcategory;
use App\Models\Subscriber;
use App\Models\User\Quote;
use App\Models\Testimonial;
use Illuminate\Http\Request;
use App\Models\BasicExtended;
use App\Models\OfflineGateway;
use App\Models\PaymentGateway;
use App\Models\User\UserVcard;
use App\Models\User\HeroSlider;
use App\Models\User\QuoteInput;
use App\Http\Helpers\MegaMailer;
use App\Models\User\UserContact;
use App\Models\User\UserFeature;
use App\Models\User\BasicSetting;
use App\Models\User\HomePageText;
use JeroenDesloovere\VCard\VCard;
use App\Models\BasicSetting as BS;
use Illuminate\Support\Facades\DB;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;
use App\Models\BasicExtended as BE;
use App\Http\Controllers\Controller;
use App\Models\User\UserOfferBanner;
use Illuminate\Support\Facades\Auth;
use App\Models\User\CustomerWishList;
use App\Models\User\UserCustomDomain;
use App\Models\User\PortfolioCategory;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Session;
use App\Http\Helpers\UserPermissionHelper;
use App\Models\User\Blog as UserBlog;
use App\Models\User\BlogCategory;
use App\Models\User\BlogView;
use App\Models\User\BookmarkPost;
use App\Models\User\CounterInformation;
use App\Models\User\CourseManagement\Course;
use App\Models\User\CourseManagement\CourseCategory;
use App\Models\User\CourseManagement\CourseEnrolment;
use App\Models\User\DonationManagement\Donation;
use App\Models\User\DonationManagement\DonationContent;
use App\Models\User\DonationManagement\DonationDetail;
use App\Models\User\GalleryCategory;
use App\Models\User\GalleryItem;
use App\Models\User\HotelBooking\Room;
use App\Models\User\HotelBooking\RoomContent;
use App\Models\User\Language as UserLanguage;
use App\Models\User\UserItemCategory;
use App\Traits\MiscellaneousTrait;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class FrontendController extends Controller
{
    use MiscellaneousTrait;
    public function __construct()
    {
        $bs = BS::first();
        $be = BE::first();

        if ($bs) {
            Config::set('captcha.sitekey', $bs->google_recaptcha_site_key);
            Config::set('captcha.secret', $bs->google_recaptcha_secret_key);
        }
        if ($be) {
            Config::set('mail.host', $be->smtp_host);
            Config::set('mail.port', $be->smtp_port);
            Config::set('mail.username', $be->smtp_username);
            Config::set('mail.password', $be->smtp_password);
            Config::set('mail.encryption', $be->encryption);
        }
    }
    public function index()
    {
        if (session()->has('lang')) {
            $currentLang = Language::where('code', session()->get('lang'))->first();
        } else {
            $currentLang = Language::where('is_default', 1)->first();
        }
        if (!$currentLang) {
            return response(
                'Veritabaninda dil kaydi yok (languages bos). Railway Deploy Logs icinde "SQL import" / mysql hatalarina bakin; MySQL sifresi ve DB_DATABASE dogru mu kontrol edin. Gerekirse MySQL veritabanini bosaltip yeniden deploy edin.',
                503,
                ['Content-Type' => 'text/plain; charset=UTF-8']
            );
        }
        $lang_id = $currentLang->id;
        $data['bs'] = $currentLang->basic_setting;
        $data['be'] = $currentLang->basic_extended;

        if (!$data['bs'] || !$data['be']) {
            return response(
                'basic_settings veya basic_extended kaydi yok (dil id: ' . $lang_id . '). Veritabani importu eksik olabilir.',
                503,
                ['Content-Type' => 'text/plain; charset=UTF-8']
            );
        }

        $data['processes'] = Process::where('language_id', $lang_id)->orderBy('serial_number', 'ASC')->get();
        $data['features'] = Feature::where('language_id', $lang_id)->orderBy('serial_number', 'ASC')->get();
        $data['featured_users'] = User::where([
            ['featured', 1],
            ['status', 1]
        ])
            ->whereHas('memberships', function ($q) {
                $q->where('status', '=', 1)
                    ->where('start_date', '<=', Carbon::now()->format('Y-m-d'))
                    ->where('expire_date', '>=', Carbon::now()->format('Y-m-d'));
            })->get();

        $data['templates'] = User::where([
            ['preview_template', 1],
            ['show_home', 1],
            ['status', 1],
            ['online_status', 1]
        ])
            ->whereHas('memberships', function ($q) {
                $q->where('status', '=', 1)
                    ->where('start_date', '<=', Carbon::now()->format('Y-m-d'))
                    ->where('expire_date', '>=', Carbon::now()->format('Y-m-d'));
            })->orderBy('template_serial_number', 'ASC')->get();

        $data['testimonials'] = Testimonial::where('language_id', $lang_id)
            ->orderBy('serial_number', 'ASC')
            ->get();
        $data['blogs'] = Blog::where('language_id', $lang_id)->orderBy('id', 'DESC')->take(3)->get();

        $data['packages'] = Package::query()->where('status', '1')->where('featured', '1')->get();
        $data['partners'] = Partner::where('language_id', $lang_id)
            ->orderBy('serial_number', 'ASC')
            ->get();

        $data['seo'] = Seo::where('language_id', $lang_id)->first();

        $terms = [];
        if (Package::query()->where('status', '1')->where('featured', '1')->where('term', 'monthly')->count() > 0) {
            $terms[] = 'Monthly';
        }
        if (Package::query()->where('status', '1')->where('featured', '1')->where('term', 'yearly')->count() > 0) {
            $terms[] = 'Yearly';
        }
        if (Package::query()->where('status', '1')->where('featured', '1')->where('term', 'lifetime')->count() > 0) {
            $terms[] = 'Lifetime';
        }
        $data['terms'] = $terms;

        $allPfeatures = $data['be']->package_features ?? '[]';
        $data['allPfeatures'] = json_decode($allPfeatures, true) ?: [];

        $data['vcards'] = UserVcard::where('preview_template', 1)->where([['status', 1], ['show_in_home', 1]])->orderBy('template_serial_number', 'ASC')->take(3)->get();
        
        return view('front.index', $data);
    }

    public function subscribe(Request $request)
    {
        $rules = [
            'email' => 'required|email|unique:subscribers'
        ];
        $bs = BS::first();
        $messages = [];
        $validator = Validator::make($request->all(), $rules, $messages);

        if ($validator->fails()) {
            $errors = $validator->getMessageBag()->toArray();
            $errrors['errors'] = $errors;
            return response()->json($errrors);
        }

        $subsc = new Subscriber;
        $subsc->email = $request->email;
        $subsc->save();

        return "success";
    }

    public function loginView()
    {

        return view('front.login');
    }

    public function checkUsername($username)
    {
        $count = User::where('username', $username)->count();
        $status = $count > 0 ? true : false;
        return response()->json($status);
    }

    public function step1($status, $id)
    {

        Session::forget('coupon');
        Session::forget('coupon_amount');

        if (Auth::check()) {
            return redirect()->route('user.plan.extend.index');
        }
        $data['status'] = $status;
        $data['id'] = $id;
        $package = Package::findOrFail($id);
        $data['package'] = $package;

        $hasSubdomain = false;
        $features = [];
        if (!empty($package->features)) {
            $features = json_decode($package->features, true);
        }
        if (is_array($features) && in_array('Subdomain', $features)) {
            $hasSubdomain = true;
        }

        $data['hasSubdomain'] = $hasSubdomain;

        return view('front.step', $data);
    }

    public function step2(Request $request)
    {
        $data = $request->session()->get('data');

        if (session()->has('coupon_amount')) {
            $data['cAmount'] = session()->get('coupon_amount');
        } else {
            $data['cAmount'] = 0;
        }

        $stripe = PaymentGateway::where('keyword', 'stripe')->where('status', 1)->first();

        if (is_null($stripe)) {
            $data['stripe_key'] = null;
        } else {
            $stripe_info = json_decode($stripe->information, true);
            $data['stripe_key'] = $stripe_info['key'];
        }

        $data['stripeError'] = __('Your card number is incomplete');
        $data['anetCardError'] = __('Please provide valid credit card number');
        $data['anetYearError'] = __('Please provide valid expiration year');
        $data['anetMonthError'] = __('Please provide valid expiration month');
        $data['anetExpirationDateError'] = __('Expiration date must be in the future');
        $data['anetCvvInvalidError'] = __('Please provide valid CVV');
        $data['successMsgForCoupon'] = __('Coupon applied successfully');

        return view('front.checkout', $data);
    }

    public function checkout(Request $request)
    {
        if (session()->has('lang')) {
            $currentLang = Language::where('code', session()->get('lang'))->first();
        } else {
            $currentLang = Language::where('is_default', 1)->first();
        }
        $bs = $currentLang->basic_setting;

        $this->validate($request, [
            'username' => 'required|alpha_num|unique:users',
            'email' => 'required|email|unique:users',
            'password' => 'required|min:8|confirmed',
            'g-recaptcha-response' => Rule::requiredIf(function () use ($bs) {
                if ($bs->is_recaptcha == 1) {
                    return true;
                }
            })
        ], [
            'g-recaptcha-response.required' => 'Please verify that you are not a robot.',
            'g-recaptcha-response.captcha' => 'Captcha error! try again later or contact site admin.',
        ]);
        $seo = Seo::where('language_id', $currentLang->id)->first();
        $be = $currentLang->basic_extended;
        $data['bex'] = $be;
        $data['username'] = $request->username;
        $data['email'] = $request->email;
        $data['password'] = $request->password;
        $data['status'] = $request->status;
        $data['id'] = $request->id;
        $online = PaymentGateway::query()->where('status', 1)->get();
        $offline = OfflineGateway::where('status', 1)->get();
        $data['offline'] = $offline;
        $data['payment_methods'] = $online->merge($offline);
        $data['package'] = Package::query()->findOrFail($request->id);
        $data['seo'] = $seo;
        $request->session()->put('data', $data);
        return redirect()->route('front.registration.step2');
    }


    // packages start
    public function pricing(Request $request)
    {
        if (session()->has('lang')) {
            $currentLang = Language::where('code', session()->get('lang'))->first();
        } else {
            $currentLang = Language::where('is_default', 1)->first();
        }
        $data['seo'] = Seo::where('language_id', $currentLang->id)->first();

        $data['bex'] = BE::first();
        $data['abs'] = BS::first();

        $terms = [];
        if (Package::query()->where('status', '1')->where('term', 'monthly')->count() > 0) {
            $terms[] = 'Monthly';
        }
        if (Package::query()->where('status', '1')->where('term', 'yearly')->count() > 0) {
            $terms[] = 'Yearly';
        }
        if (Package::query()->where('status', '1')->where('term', 'lifetime')->count() > 0) {
            $terms[] = 'Lifetime';
        }
        $data['terms'] = $terms;

        $be = BasicExtended::select('package_features')->firstOrFail();
        $allPfeatures = $be->package_features ? $be->package_features : "[]";
        $data['allPfeatures'] = json_decode($allPfeatures, true);

        return view('front.pricing', $data);
    }

    // blog section start
    public function blogs(Request $request)
    {
        if (session()->has('lang')) {
            $currentLang = Language::where('code', session()->get('lang'))->first();
        } else {
            $currentLang = Language::where('is_default', 1)->first();
        }
        $data['seo'] = Seo::where('language_id', $currentLang->id)->first();

        $data['currentLang'] = $currentLang;

        $lang_id = $currentLang->id;

        $category = $request->category;
        if (!empty($category)) {
            $data['category'] = Bcategory::findOrFail($category);
        }
        $term = $request->term;




        $data['blogs'] = Blog::when($category, function ($query, $category) {
            return $query->where('bcategory_id', $category);
        })
            ->when($term, function ($query, $term) {
                return $query->where('title', 'like', '%' . $term . '%');
            })
            ->when($currentLang, function ($query, $currentLang) {
                return $query->where('language_id', $currentLang->id);
            })->orderBy('serial_number', 'ASC')->paginate(6);
        return view('front.blogs', $data);
    }

    public function blogdetails($slug, $id)
    {
        if (session()->has('lang')) {
            $currentLang = Language::where('code', session()->get('lang'))->first();
        } else {
            $currentLang = Language::where('is_default', 1)->first();
        }

        $lang_id = $currentLang->id;


        $data['blog'] = Blog::findOrFail($id);
        $data['bcats'] = Bcategory::where('status', 1)->where('language_id', $lang_id)->orderBy('serial_number', 'ASC')->get();
        $data['recentBlogs'] = Blog::where('language_id', $currentLang->id)->take(3)->latest()->get();

        return view('front.blog-details', $data);
    }
    public function templates()
    {
        $data['templates'] = User::where([
            ['preview_template', 1],
            ['status', 1],
            ['online_status', 1]
        ])
            ->whereHas('memberships', function ($q) {
                $q->where('status', '=', 1)
                    ->where('start_date', '<=', Carbon::now()->format('Y-m-d'))
                    ->where('expire_date', '>=', Carbon::now()->format('Y-m-d'));
            })->orderBy('template_serial_number', 'ASC')->paginate(9);
        return view('front.templates', $data);
    }
    public function vcards()
    {
        $data['vcards'] = UserVcard::where('preview_template', 1)->where('status', 1)->orderBy('template_serial_number', 'ASC')->paginate(12);
        return view('front.vcards', $data);
    }
    public function contactView()
    {


        if (session()->has('lang')) {
            $currentLang = Language::where('code', session()->get('lang'))->first();
        } else {
            $currentLang = Language::where('is_default', 1)->first();
        }
        $data['seo'] = Seo::where('language_id', $currentLang->id)->first();

        return view('front.contact', $data);
    }

    public function faqs()
    {
        if (session()->has('lang')) {
            $currentLang = Language::where('code', session()->get('lang'))->first();
        } else {
            $currentLang = Language::where('is_default', 1)->first();
        }
        $data['seo'] = Seo::where('language_id', $currentLang->id)->first();

        $lang_id = $currentLang->id;
        $data['faqs'] = Faq::where('language_id', $lang_id)
            ->orderBy('serial_number', 'ASC')
            ->get();
        return view('front.faq', $data);
    }

    public function dynamicPage($slug)
    {
        $data['page'] = Page::where('slug', $slug)->firstOrFail();

        return view('front.dynamic', $data);
    }

    public function users(Request $request)
    {
        if (session()->has('lang')) {
            $currentLang = Language::where('code', session()->get('lang'))->first();
        } else {
            $currentLang = Language::where('is_default', 1)->first();
        }
        $data['seo'] = Seo::where('language_id', $currentLang->id)->first();

        $homeTexts = [];
        if (!empty($request->designation)) {
            $homeTexts = HomePageText::when($request->designation, function ($q) use ($request) {
                return $q->where('designation', 'like', '%' . $request->designation . '%');
            })->select('user_id')->get();
        }

        $userIds = [];

        foreach ($homeTexts as $key => $homeText) {
            if (!in_array($homeText->user_id, $userIds)) {
                $userIds[] = $homeText->user_id;
            }
        }
        $data['users'] = null;
        $users = User::where('online_status', 1)
            ->whereHas('memberships', function ($q) {
                $q->where('status', '=', 1)
                    ->where('start_date', '<=', Carbon::now()->format('Y-m-d'))
                    ->where('expire_date', '>=', Carbon::now()->format('Y-m-d'));
            })
            ->when($request->company, function ($q) use ($request) {
                return $q->where('company_name', 'like', '%' . $request->company . '%');
            })
            ->when($request->location, function ($q) use ($request) {
                return $q->where(function ($query) use ($request) {
                    $query->where('city', 'like', '%' . $request->location . '%')
                        ->orWhere('state', 'like', '%' . $request->location . '%')
                        ->orWhere('address', 'like', '%' . $request->location . '%')
                        ->orWhere('country', 'like', '%' . $request->location . '%');
                });
            })
            ->orderBy('id', 'DESC')
            ->paginate(9);

        $data['users'] = $users;
        return view('front.users', $data);
    }
    public function userDetailView($domain)
    {
        $user = getUser();


        $data['user'] = $user;
        if (Auth::check() && Auth::user()->id != $user->id && $user->online_status != 1) {
            return redirect()->route('front.index');
        } elseif (!Auth::check() && $user->online_status != 1) {
            return redirect()->route('front.index');
        }
        $package = UserPermissionHelper::userPackage($user->id);
        if (is_null($package)) {
            Session::flash('warning', 'User membership is expired');
            if (Auth::check()) {
                return redirect()->route('user-dashboard')->with('error', 'User membership is expired');
            } else {
                return redirect()->route('front.user.view');
            }
        }

        if (session()->has('user_lang')) {
            $userCurrentLang = UserLanguage::where('code', session()->get('user_lang'))->where('user_id', $user->id)->first();
            if (empty($userCurrentLang)) {
                $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
                session()->put('user_lang', $userCurrentLang->code);
            }
        } else {
            $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
        }

        $userBs = \App\Models\User\BasicSetting::where('user_id', $user->id)->first();


        $data['home_sections'] = User\HomeSection::where('user_id', $user->id)->first();

        $data['home_text'] = User\HomePageText::query()
            ->where([
                ['user_id', $user->id],
                ['language_id', $userCurrentLang->id]
            ])->first();
        $data['portfolios'] = $user->portfolios()
            ->where('language_id', $userCurrentLang->id)
            ->where('featured', 1)
            ->orderBy('serial_number', 'ASC')
            ->get() ?? collect([]);
        $data['portfolio_categories'] = $user->portfolioCategories()
            ->whereHas('portfolios', function ($q) {
                $q->where('featured', 1);
            })
            ->where('language_id', $userCurrentLang->id)
            ->where('status', 1)
            ->orderBy('serial_number', 'ASC')
            ->get() ?? collect([]);
        $data['skills'] = $user->skills()
            ->where('language_id', $userCurrentLang->id)
            ->orderBy('serial_number', 'ASC')
            ->get() ?? collect([]);
        $data['counterInformations'] = $user->counterInformations()
            ->where('language_id', $userCurrentLang->id)
            ->orderBy('serial_number', 'ASC')
            ->get() ?? collect([]);
        $data['services'] = $user->services()->where([
            ['lang_id', $userCurrentLang->id],
            ['featured', 1]
        ])
            ->orderBy('serial_number', 'ASC')
            ->get() ?? collect([]);
        $data['testimonials'] = $user->testimonials()
            ->where('lang_id', $userCurrentLang->id)
            ->orderBy('serial_number', 'ASC')
            ->get() ?? collect([]);
        $blogLimits = 3;
        $userdefaultLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
        $data['videoSectionDetails'] =
            User\HomePageText::query()
            ->where([
                ['user_id', $user->id],
                ['language_id', $userdefaultLang->id]
            ])->select(['video_section_image', 'video_section_title', 'video_section_subtitle', 'video_section_button_url', 'video_section_button_text', 'video_section_url', 'video_section_text'])->first();
   

        if ($userBs->theme == 'home_one') {
            $blogLimits = 3;
        } elseif ($userBs->theme == 'home_four' || $userBs->theme == 'home_five' || $userBs->theme == 'home_seven') {
            $blogLimits = 3;
        } elseif ($userBs->theme == 'home_six' || $userBs->theme == 'home_eleven') {
            $blogLimits = 4;
        } elseif ($userBs->theme == 'home_two' || $userBs->theme == 'home_three') {
            $blogLimits = 6;
        }
        //  CHECK permissions
        if (!empty($user)) {
            $permissions = UserPermissionHelper::packagePermission($user->id);
            $permissions = json_decode($permissions, true);
        }

        $data['blogs'] = $user->blogs()
            ->where('language_id', $userCurrentLang->id)
            ->orderBy('id', 'DESC')
            ->take($blogLimits)
            ->get() ?? collect([]);
        $data['teams'] = $user->teams()
            ->where('language_id', $userCurrentLang->id)
            ->where('featured', 1)
            ->get() ?? collect([]);
        $data['brands'] = $user->brands()
            ->get() ?? collect([]);
        $data['sliders'] = HeroSlider::where('language_id', $userCurrentLang->id)
            ->where('user_id', $user->id)
            ->orderBy('serial_number', 'asc')
            ->get();
        if ($userBs->theme == 'home_two') {
            $data['work_processes'] = User\WorkProcess::where([
                ['user_id', $user->id],
                ['language_id', $userCurrentLang->id]
            ])->orderBy('serial_number', 'ASC')->get();
            return view('user-front.home.index-2', $data);
        } elseif ($userBs->theme == 'home_three') {
            $data['work_processes'] = User\WorkProcess::where([
                ['user_id', $user->id],
                ['language_id', $userCurrentLang->id]
            ])->orderBy('serial_number', 'ASC')->get();
            $data['contact'] = UserContact::where([
                ['user_id', $user->id],
                ['language_id', $userCurrentLang->id]
            ])->first();
            $data['faqs'] = User\FAQ::query()
                ->where('user_id', $user->id)
                ->where('language_id', $userCurrentLang->id)
                ->where('featured', 1)
                ->get();
            $data['static'] = User\HeroStatic::where('user_id', $user->id)
                ->where('language_id', $userCurrentLang->id)
                ->first();
            return view('user-front.home.index-3', $data);
        } elseif ($userBs->theme == 'home_four') {

            $data['work_processes'] = User\WorkProcess::where([
                ['user_id', $user->id],
                ['language_id', $userCurrentLang->id]
            ])->orderBy('serial_number', 'ASC')->get();
            $data['contact'] = UserContact::where([
                ['user_id', $user->id],
                ['language_id', $userCurrentLang->id]
            ])->first();
            $data['faqs'] = User\FAQ::query()
                ->where('user_id', $user->id)
                ->where('language_id', $userCurrentLang->id)
                ->where('featured', 1)
                ->get();
            $data['static'] = User\HeroStatic::where('user_id', $user->id)
                ->where('language_id', $userCurrentLang->id)
                ->first();
            $data['portfolioCategories'] = PortfolioCategory::where('user_id', $user->id)
                ->where('language_id', $userCurrentLang->id)->where('is_featured', 1)->get();
            return view('user-front.home.index-4', $data);
        } elseif ($userBs->theme == 'home_five') {

            $data['work_processes'] = User\WorkProcess::where([
                ['user_id', $user->id],
                ['language_id', $userCurrentLang->id]
            ])->orderBy('serial_number', 'ASC')->get();
            $data['contact'] = UserContact::where([
                ['user_id', $user->id],
                ['language_id', $userCurrentLang->id]
            ])->first();
            $data['faqs'] = User\FAQ::query()
                ->where('user_id', $user->id)
                ->where('language_id', $userCurrentLang->id)
                ->where('featured', 1)
                ->get();
            $data['static'] = User\HeroStatic::where('user_id', $user->id)
                ->where('language_id', $userCurrentLang->id)
                ->first();
            $data['portfolioCategories'] = PortfolioCategory::where('user_id', $user->id)
                ->where('language_id', $userCurrentLang->id)->where('is_featured', 1)->get();
            return view('user-front.home.index-5', $data);
        } elseif ($userBs->theme == 'home_six') {
            $data['work_processes'] = User\WorkProcess::where([
                ['user_id', $user->id],
                ['language_id', $userCurrentLang->id]
            ])->orderBy('serial_number', 'ASC')->get();
            $data['contact'] = UserContact::where([
                ['user_id', $user->id],
                ['language_id', $userCurrentLang->id]
            ])->first();
            $data['faqs'] = User\FAQ::query()
                ->where('user_id', $user->id)
                ->where('language_id', $userCurrentLang->id)
                ->where('featured', 1)
                ->get();
            $data['static'] = User\HeroStatic::where('user_id', $user->id)
                ->where('language_id', $userCurrentLang->id)
                ->first();
            return view('user-front.home.index-6', $data);
        } elseif ($userBs->theme == 'home_seven') {
            $data['contact'] = UserContact::where([
                ['user_id', $user->id],
                ['language_id', $userCurrentLang->id]
            ])->first();
            $data['work_processes'] = User\WorkProcess::where([
                ['user_id', $user->id],
                ['language_id', $userCurrentLang->id]
            ])->orderBy('serial_number', 'ASC')->get();
            $data['faqs'] = User\FAQ::query()
                ->where('user_id', $user->id)
                ->where('language_id', $userCurrentLang->id)
                ->where('featured', 1)
                ->get();
            return view('user-front.home.index-7', $data);
        } elseif ($userBs->theme == 'home_eight') {
            if (!empty($permissions) && !in_array('Ecommerce', $permissions)) {
                $userBs->theme = 'home_one';
                $userBs->save();
                return redirect()->route('front.user.view');
            }
            $data['sliders'] = HeroSlider::where('language_id', $userCurrentLang->id)
                ->orderBy('serial_number', 'ASC')
                ->where('user_id', $user->id)
                ->get();
            $data['features'] = UserFeature::where('language_id', $userCurrentLang->id)
                ->where('user_id', $user->id)
                ->orderBy('serial_number', 'ASC')
                ->get();
            $data['topbanners'] = UserOfferBanner::where('language_id', $userCurrentLang->id)
                ->where('user_id', $user->id)
                ->where('position', 'top')
                ->orderBy('id', 'DESC')
                ->get();
            $data['bottombanners'] = UserOfferBanner::where('language_id', $userCurrentLang->id)
                ->where('user_id', $user->id)
                ->where('position', 'bottom')
                ->orderBy('id', 'DESC')
                ->get();
            $data['leftbanners'] = UserOfferBanner::where('language_id', $userCurrentLang->id)
                ->where('user_id', $user->id)
                ->where('position', 'left')
                ->orderBy('id', 'DESC')
                ->get();

            $itemlimit = 10;
            $data['featured_items']  = DB::table('user_items')->where('user_items.user_id', $user->id)->where('user_items.status', 1)
                ->where('user_items.is_feature', 1)
                ->Join('user_item_contents', 'user_items.id', '=', 'user_item_contents.item_id')
                ->join('user_item_categories', 'user_item_contents.category_id', '=', 'user_item_categories.id')
                ->select('user_items.*', 'user_items.id AS item_id', 'user_item_contents.*', 'user_item_categories.name AS category')
                ->orderBy('user_items.id', 'DESC')
                ->where('user_item_contents.language_id', '=', $userCurrentLang->id)
                ->where('user_item_categories.language_id', '=', $userCurrentLang->id)
                ->limit($itemlimit)
                ->get();
            $data['new_items']  = DB::table('user_items')->where('user_items.status', 1)->where('user_items.user_id', $user->id)
                ->Join('user_item_contents', 'user_items.id', '=', 'user_item_contents.item_id')
                ->join('user_item_categories', 'user_item_contents.category_id', '=', 'user_item_categories.id')
                ->select('user_items.*', 'user_items.id AS item_id', 'user_item_contents.*', 'user_item_categories.name AS category')
                ->orderBy('user_items.id', 'DESC')
                ->where('user_item_contents.language_id', '=', $userCurrentLang->id)
                ->where('user_item_categories.language_id', '=', $userCurrentLang->id)
                ->limit($itemlimit)
                ->get();

            $data['rating_items']  = DB::table('user_items')->where('user_items.rating', '>', 0)->where('user_items.status', 1)->where('user_items.user_id', $user->id)
                ->Join('user_item_contents', 'user_items.id', '=', 'user_item_contents.item_id')
                ->join('user_item_categories', 'user_item_contents.category_id', '=', 'user_item_categories.id')
                ->select('user_items.*', 'user_items.id AS item_id', 'user_item_contents.*', 'user_item_categories.name AS category')
                ->orderBy('user_items.rating', 'DESC')
                ->where('user_item_contents.language_id', '=', $userCurrentLang->id)
                ->where('user_item_categories.language_id', '=', $userCurrentLang->id)
                ->limit($itemlimit)
                ->get();
            $data['special_offer_items']  = DB::table('user_items')->where('user_items.status', 1)->where('user_items.user_id', $user->id)
                ->where('user_items.special_offer', 1)
                ->Join('user_item_contents', 'user_items.id', '=', 'user_item_contents.item_id')
                ->join('user_item_categories', 'user_item_contents.category_id', '=', 'user_item_categories.id')
                ->select('user_items.*', 'user_items.id AS item_id', 'user_item_contents.*', 'user_item_categories.name AS category')
                ->orderBy('user_items.id', 'DESC')
                ->where('user_item_contents.language_id', '=', $userCurrentLang->id)
                ->where('user_item_categories.language_id', '=', $userCurrentLang->id)
                ->get();
            $data['best_seller_items']  = DB::table('user_order_items')
                ->leftJoin('user_items', 'user_items.id', '=', 'user_order_items.item_id')
                ->leftJoin('user_orders', 'user_orders.id', '=', 'user_order_items.user_order_id')
                ->Join('user_item_contents', 'user_items.id', '=', 'user_item_contents.item_id')
                ->join('user_item_categories', 'user_order_items.category', '=', 'user_item_categories.id')
                ->select(
                    'user_items.id',
                    'user_items.current_price',
                    'user_orders.payment_status',
                    'user_items.rating',
                    'user_items.previous_price',
                    'user_item_contents.title',
                    'user_item_contents.slug',
                    'user_item_categories.name AS category',
                    'user_item_categories.id AS category_id',
                    'user_items.thumbnail',
                    'user_items.flash',
                    'user_items.stock',
                    'user_items.type',
                    'user_items.start_date',
                    'user_items.end_date',
                    'user_items.start_time',
                    'user_items.end_time',
                    'user_items.flash_percentage',
                    'user_order_items.item_id',
                    DB::raw('SUM(user_order_items.qty) as total')
                )
                ->groupBy('user_items.id', 'user_orders.payment_status', 'user_items.flash', 'user_items.stock', 'user_items.type', 'user_items.start_date', 'user_items.start_time', 'user_items.end_time', 'user_items.end_date', 'user_items.flash_percentage', 'user_items.rating', 'user_items.current_price', 'user_item_categories.id', 'user_item_categories.name', 'user_item_contents.title', 'user_item_contents.slug', 'user_items.previous_price', 'user_items.thumbnail', 'user_order_items.item_id')
                ->where('user_orders.payment_status', '=', 'Completed')
                ->where('user_item_contents.language_id', '=', $userCurrentLang->id)
                ->where('user_item_categories.language_id', '=', $userCurrentLang->id)
                ->orderBy('total', 'desc')
                ->limit($itemlimit)
                ->get();
            $bs = BasicSetting::where('user_id', $user->id)->first();
            Config::set('app.timezone', $bs->timezoneinfo->timezone);
            $data['flash_items']  = DB::table('user_items')->where('user_items.status', 1)->where('user_items.user_id', $user->id)
                ->where('user_items.flash', 1)
                ->where('user_items.start_date_time', '<=', Carbon::now()->tz($bs->timezoneinfo->timezone)->format('Y-m-d H:i:s A'))
                ->where('user_items.end_date_time', '>=', Carbon::now()->tz($bs->timezoneinfo->timezone)->format('Y-m-d H:i:s A'))
                ->Join('user_item_contents', 'user_items.id', '=', 'user_item_contents.item_id')
                ->join('user_item_categories', 'user_item_contents.category_id', '=', 'user_item_categories.id')
                ->select('user_items.*', 'user_items.id AS item_id', 'user_item_contents.*', 'user_item_categories.name AS category')
                ->orderBy('user_items.id', 'DESC')
                ->where('user_item_contents.language_id', '=', $userCurrentLang->id)
                ->where('user_item_categories.language_id', '=', $userCurrentLang->id)
                ->get();

            if (Auth::guard('customer')->check()) {
                $data['myWishlist'] = CustomerWishList::where('customer_id', Auth::guard('customer')->user()->id)->pluck('item_id')->toArray();
            } else {
                $data['myWishlist'] = [];
            }
            return view('user-front.home.index-8', $data);
        } elseif ($userBs->theme == 'home_nine') {
            if (!empty($permissions) && !in_array('Hotel Booking', $permissions)) {
                $userBs->theme = 'home_one';
                $userBs->save();
                return redirect()->route('front.user.view');
            }


            $data['sliders'] = HeroSlider::where('language_id', $userCurrentLang->id)
                ->orderBy('serial_number', 'ASC')
                ->where('user_id', $user->id)
                ->get();
            $data['rooms'] = RoomContent::where('user_id', $user->id)->with(['room' => function ($query) {
                $query->where('status', 1)->where('is_featured', 1);
            }])->where('language_id', $userCurrentLang->id)
                ->get();
            $data['chooseUsItems'] = DB::table('user_choose_us_items')->where('user_id', $user->id)->where('language_id', $userCurrentLang->id)->orderBy('serial_number')->get();

            $data['numOfBed'] = Room::where([['status', 1], ['user_id', $user->id]])->max('bed');

            $data['numOfBath'] = Room::where([['status', 1], ['user_id', $user->id]])->max('bath');

            $data['numOfGuest'] = Room::where([['status', 1, ['user_id', $user->id]]])->max('max_guests');

            return view('user-front.home.index-9', $data);
        } elseif ($userBs->theme == 'home_ten') {
            if (!empty($permissions) && !in_array('Course Management', $permissions)) {
                $userBs->theme = 'home_one';
                $userBs->save();
                return redirect()->route('front.user.view');
            }
            $data['static'] = User\HeroStatic::where('user_id', $user->id)
                ->where('language_id', $userCurrentLang->id)
                ->first();
            $data['categories'] = CourseCategory::query()->where('user_id', $user->id)
                ->where('language_id', $userCurrentLang->id)
                ->where('status', 1)
                ->orderBy('serial_number', 'ASC')
                ->get();

            $data['callToActionInfo'] = User\ActionSection::query()
                ->where('user_id', $user->id)
                ->where('language_id', $userCurrentLang->id)
                ->first();
            $courses = Course::query()
                ->join('user_course_informations', 'user_courses.id', '=', 'user_course_informations.course_id')
                ->join('user_course_categories', 'user_course_categories.id', '=', 'user_course_informations.course_category_id')
                ->join('user_course_instructors', 'user_course_instructors.id', '=', 'user_course_informations.instructor_id')
                ->where('user_courses.status', '=', 'published')
                ->where('user_courses.user_id', '=', $user->id)
                ->where('user_courses.is_featured', '=', 'yes')
                ->where('user_course_informations.language_id', '=', $userCurrentLang->id)
                ->select('user_courses.id', 'user_courses.thumbnail_image', 'user_courses.pricing_type', 'user_courses.previous_price', 'user_courses.current_price', 'user_courses.average_rating', 'user_courses.duration', 'user_course_informations.title', 'user_course_informations.slug', 'user_course_categories.name as categoryName', 'user_course_instructors.image as instructorImage', 'user_course_instructors.name as instructorName')
                ->orderByDesc('user_courses.id')
                ->get();

            $courses->map(function ($course) use ($user) {
                $course['enrolmentCount'] = CourseEnrolment::query()
                    ->where('user_id', $user->id)
                    ->where('course_id', '=', $course->id)
                    ->where(function ($query) {
                        $query->where('payment_status', 'completed')
                            ->orWhere('payment_status', 'free');
                    })
                    ->count();
            });

            $data['courses'] = $courses;
            $data['categories'] = CourseCategory::query()->where('user_id', $user->id)
                ->where('language_id', $userCurrentLang->id)
                ->where('status', 1)
                ->orderBy('serial_number', 'ASC')
                ->where('is_featured', '=', 1)
                ->get();

            $data['featuredImage'] = $userBs->features_section_image;
            $data['features'] = UserFeature::query()->where('user_id', $user->id)
                ->where('language_id', $userCurrentLang->id)
                ->orderBy('serial_number', 'ASC')
                ->get();
            $userdefaultLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
            $data['videoData'] = HomePageText::query()
                ->where('user_id', $user->id)
                ->where('language_id', $userdefaultLang->id)
                ->select('video_section_image', 'video_section_url')
                ->first();
            $data['countInfos'] = CounterInformation::query()
                ->where('user_id', $user->id)
                ->where('language_id', $userCurrentLang->id)
                ->orderBy('serial_number', 'ASC')
                ->get();
            $data['currencyInfo'] =  MiscellaneousTrait::getCurrencyInfo($user->id);

            return view('user-front.home.index-10', $data);
        } elseif ($userBs->theme == 'home_eleven') {
            if (!empty($permissions) && !in_array('Donation Management', $permissions)) {
                $userBs->theme = 'home_one';
                $userBs->save();
                return redirect()->route('front.user.view');
            }
            $data['static'] = User\HeroStatic::where('user_id', $user->id)
                ->where('language_id', $userCurrentLang->id)
                ->first();
            $data['features'] = UserFeature::where('language_id', $userCurrentLang->id)
                ->where('user_id', $user->id)
                ->orderBy('serial_number', 'ASC')
                ->get();
            $data['countInfos'] = CounterInformation::query()
                ->where('user_id', $user->id)
                ->where('language_id', $userCurrentLang->id)
                ->orderBy('serial_number', 'ASC')
                ->get();
            $data['donationCategories'] = $userCurrentLang->donationCategories->where('status', 1)->where('is_featured', 1);


            $causes = Donation::where('user_id', $user->id)->latest()->take(6)->get();

            $causes->map(function ($cause) use ($user, $userCurrentLang) {
                $title = $cause->contents->where('language_id', $userCurrentLang->id)->first();
                if (!empty($title)) {
                    $cause['title'] = $title->title;
                    $cause['slug'] = $title->slug;
                    $cause['iamge'] = $title->image;
                }
                $raised_amount = DonationDetail::query()
                    ->where('donation_id', '=', $cause->id)
                    ->where('status', '=', "completed")
                    ->sum('amount');
                $goal_percentage = $raised_amount > 0 ? (($raised_amount / $cause->goal_amount) * 100) : 0;
                $cause['raised_amount'] = $raised_amount > 0 ? round($raised_amount, 2) : 0;
                $cause['goal_percentage'] = round($goal_percentage, 1);
            });
            $data['causes'] = $causes;
            return view('user-front.home.index-11', $data);
        } elseif ($userBs->theme == 'home_twelve') {
            if (!empty($permissions) && !in_array('Portfolio', $permissions)) {
                $userBs->theme = 'home_one';
                $userBs->save();
                return redirect()->route('front.user.view');
            }
            $data['static'] = User\HeroStatic::where('user_id', $user->id)
                ->where('language_id', $userCurrentLang->id)
                ->first();
            $data['countInfos'] = CounterInformation::query()
                ->where('user_id', $user->id)
                ->where('language_id', $userCurrentLang->id)
                ->orderBy('serial_number', 'ASC')
                ->get();

            $data['job_experiences'] = $user->job_experiences()
                ->where('language_id', $userCurrentLang->id)
                ->orderBy('serial_number', 'ASC')
                ->get() ?? collect([]);
            $data['educations'] = $user->educations()
                ->where('language_id', $userCurrentLang->id)
                ->orderBy('serial_number', 'ASC')
                ->get() ?? collect([]);

            return view('user-front.home.index-12', $data);
        } elseif ($userBs->theme == 'home_thirteen') {
            if (!empty($permissions) && !in_array('Blog', $permissions)) {
                $userBs->theme = 'home_one';
                $userBs->save();
                return redirect()->route('front.user.view');
            }
            $data['bcategories'] = BlogCategory::where('user_id', $user->id)
                ->where('language_id', $userCurrentLang->id)
                ->where('status', 1)
                ->orderBy('serial_number')
                ->get();
            $data['sliders'] = UserBlog::where('user_id', $user->id)
                ->where('language_id', $userCurrentLang->id)
                ->where('is_slider', 1)
                ->orderBy('serial_number')
                ->get();
            $data['featuredBlogs'] = UserBlog::where('user_id', $user->id)
                ->where('language_id', $userCurrentLang->id)
                ->where('is_featured', 1)
                ->orderBy('serial_number')
                ->get();
            $data['mostViewedblogs'] = UserBlog::where('user_id', $user->id)
                ->where('language_id', $userCurrentLang->id)
                ->where('views', '!=', 0)
                ->orderByDesc('views')
                ->limit(5)
                ->get();
            $data['latestPosts'] = UserBlog::where('user_id', $user->id)
                ->where('language_id', $userCurrentLang->id)
                ->orderByDesc('created_at')
                ->limit(6)
                ->get();

            $data['featPostCategories'] = BlogCategory::where('user_id', $user->id)
                ->where('language_id', $userCurrentLang->id)
                ->where('status', 1)
                ->where('is_featured', 1)
                ->orderBy('serial_number', 'ASC')
                ->get();

            $data['galleryItems'] = GalleryItem::query()
                ->where('language_id', $userCurrentLang->id)
                ->where('is_featured', 1)
                ->where('user_id', $user->id)
                ->orderBy('serial_number', 'ASC')
                ->get();
            $data['gallery_bg'] = BasicSetting::where('user_id', $user->id)
                ->select('gallery_bg')
                ->first();
            if (Auth::guard('customer')->check() == true) {
                $authUser = Auth::guard('customer')->user();
                $data['bookmarkPosts'] = BookmarkPost::query()
                    ->where('user_id', $authUser->id)
                    ->where('author_id', $user->id)
                    ->get();
            }

            return view('user-front.home.index-13', $data);
        } elseif ($userBs->theme == 'home_fourteen') {
            if (!empty($permissions) && !in_array('Ecommerce', $permissions)) {
                $userBs->theme = 'home_one';
                $userBs->save();
                return redirect()->route('front.user.view');
            }
            $data['static'] = User\HeroStatic::where('user_id', $user->id)
                ->where('language_id', $userCurrentLang->id)
                ->first();
            $data['features'] = UserFeature::where('language_id', $userCurrentLang->id)
                ->where('user_id', $user->id)
                ->orderBy('serial_number', 'ASC')
                ->get();
            $data['featureCategories'] = UserItemCategory::where('language_id', $userCurrentLang->id)
                ->where('language_id', $userCurrentLang->id)
                ->where('user_id', $user->id)
                ->where('status', 1)
                ->where('is_feature', 1)
                ->orderBy('name', 'asc')
                ->get();
            $data['topbanners'] = UserOfferBanner::where('language_id', $userCurrentLang->id)
                ->where('user_id', $user->id)
                ->where('position', 'top')
                ->orderBy('id', 'DESC')
                ->get();
            $data['bottombanners'] = UserOfferBanner::where('language_id', $userCurrentLang->id)
                ->where('user_id', $user->id)
                ->where('position', 'bottom')
                ->orderBy('id', 'DESC')
                ->get();
            $data['leftbanners'] = UserOfferBanner::where('language_id', $userCurrentLang->id)
                ->where('user_id', $user->id)
                ->where('position', 'left')
                ->orderBy('id', 'DESC')
                ->get();

            $data['sliders'] = HeroSlider::where('language_id', $userCurrentLang->id)
                ->orderBy('serial_number', 'ASC')
                ->where('user_id', $user->id)
                ->get();

            $bs = BasicSetting::where('user_id', $user->id)->first();
            Config::set('app.timezone', $bs->timezoneinfo->timezone);
            $data['flash_items']  = DB::table('user_items')->where('user_items.status', 1)->where('user_items.user_id', $user->id)
                ->where('user_items.flash', 1)
                ->where('user_items.start_date_time', '<=', Carbon::now()->tz($bs->timezoneinfo->timezone)->format('Y-m-d H:i:s A'))
                ->where('user_items.end_date_time', '>=', Carbon::now()->tz($bs->timezoneinfo->timezone)->format('Y-m-d H:i:s A'))
                ->Join('user_item_contents', 'user_items.id', '=', 'user_item_contents.item_id')
                ->join('user_item_categories', 'user_item_contents.category_id', '=', 'user_item_categories.id')
                ->select('user_items.*', 'user_items.id AS item_id', 'user_item_contents.*', 'user_item_categories.name AS category')
                ->orderBy('user_items.id', 'DESC')
                ->where('user_item_contents.language_id', '=', $userCurrentLang->id)
                ->where('user_item_categories.language_id', '=', $userCurrentLang->id)
                ->get();
            $itemlimit = 10;
            $data['featured_items']  = DB::table('user_items')->where('user_items.user_id', $user->id)->where('user_items.status', 1)
                ->where('user_items.is_feature', 1)
                ->Join('user_item_contents', 'user_items.id', '=', 'user_item_contents.item_id')
                ->join('user_item_categories', 'user_item_contents.category_id', '=', 'user_item_categories.id')
                ->select('user_items.*', 'user_items.id AS item_id', 'user_item_contents.*', 'user_item_categories.name AS category')
                ->orderBy('user_items.id', 'DESC')
                ->where('user_item_contents.language_id', '=', $userCurrentLang->id)
                ->where('user_item_categories.language_id', '=', $userCurrentLang->id)
                ->limit($itemlimit)
                ->get();
            $data['rating_items']  = DB::table('user_items')->where('user_items.rating', '>', 0)->where('user_items.status', 1)->where('user_items.user_id', $user->id)
                ->Join('user_item_contents', 'user_items.id', '=', 'user_item_contents.item_id')
                ->join('user_item_categories', 'user_item_contents.category_id', '=', 'user_item_categories.id')
                ->select('user_items.*', 'user_items.id AS item_id', 'user_item_contents.*', 'user_item_categories.name AS category')
                ->orderBy('user_items.rating', 'DESC')
                ->where('user_item_contents.language_id', '=', $userCurrentLang->id)
                ->where('user_item_categories.language_id', '=', $userCurrentLang->id)
                ->limit($itemlimit)
                ->get();

            $now = Carbon::now()->tz($bs->timezoneinfo->timezone)->toDateTimeString();

            $data['on_sale_items'] = DB::table('user_items')
                ->where('user_items.status', 1)
                ->where('user_items.user_id', $user->id)
                ->where(function ($q) use ($now) {
                    $q->where(function ($q2) use ($now) {
                        $q2->where('user_items.start_date_time', '<=', $now)
                            ->where('user_items.end_date_time', '>=', $now);
                    })
                        ->orWhere(function ($q3) {
                            $q3->whereColumn('user_items.previous_price', '>', 'user_items.current_price');
                        });
                })
                ->join('user_item_contents', 'user_items.id', '=', 'user_item_contents.item_id')
                ->join('user_item_categories', 'user_item_contents.category_id', '=', 'user_item_categories.id')
                ->where('user_item_contents.language_id', $userCurrentLang->id)
                ->where('user_item_categories.language_id', $userCurrentLang->id)
                ->select(
                    'user_items.*',
                    'user_items.id AS item_id',
                    'user_item_contents.*',
                    'user_item_categories.name AS category'
                )
                ->orderBy('user_items.id', 'DESC')
                ->limit(6)
                ->get();

            if (Auth::guard('customer')->check()) {
                $data['myWishlist'] = CustomerWishList::where('customer_id', Auth::guard('customer')->user()->id)->pluck('item_id')->toArray();
            } else {
                $data['myWishlist'] = [];
            }
            return view('user-front.home.index-14', $data);
        } else {
            return view('user-front.home.index-1', $data);
        }
    }
    public function paymentInstruction(Request $request)
    {
        $offline = OfflineGateway::where('name', $request->name)
            ->select('short_description', 'instructions', 'is_receipt')
            ->first();
        return response()->json([
            'description' => $offline->short_description,
            'instructions' => $offline->instructions,
            'is_receipt' => $offline->is_receipt
        ]);
    }

    public function contactMessage($domain, Request $request)
    {

        $keywords = getUserKeywords();
        $userId = getUser()->id;

        $rules = [
            'fullname' => 'required',
            'email' => 'required|email:rfc,dns',
            'subject' => 'required',
            'message' => 'required'
        ];

        $messages = [
            'fullname.required' => $keywords['fullname_required'] ?? __('Full name is required') . '.',
            'email.required' => $keywords['email_required'] ?? __('Email is required') . '.',
            'email.email' => $keywords['email_invalid'] ?? __('Please enter a valid email address') . '.',
            'subject.required' => $keywords['subject_required'] ?? __('Subject is required') . '.',
            'message.required' => $keywords['message_required'] ?? __('Message is required') . '.',
        ];

        $ubs  = BasicSetting::where('user_id', $userId)->first();

        if ($ubs->is_recaptcha == 1) {
            $rules['g-recaptcha-response'] = 'required|captcha';
            $messages = array_merge($messages, [
                'g-recaptcha-response.required' => $keywords['g_recaptcha_response_required'] ?? __('Please verify that you are not a robot') . '.',
                'g-recaptcha-response.captcha' => $keywords['g_recaptcha_response_captcha'] ?? __('Captcha error! Try again later or contact site admin') . '.',
            ]);
        }

        $request->validate($rules, $messages);


        // $request->validate($rules);
        if (!empty($request->type) && $request->type == 'vcard') {
            $data['toMail'] = $request->to_mail;
            $data['toName'] = $request->to_name;
        } else {
            $toUser = User::query()->findOrFail($request->id);
            $data['toMail'] = $toUser->email;
            $data['toName'] = $toUser->username;
        }
        $contact_remainder_message = $keywords['further_contact_use_the_below_information'] ?? __('For further contact with the enquirer please use the below information');
        $enquirer_name = $keywords['Enquirer_Name'] ?? __('Enquirer Name');
        $enquirer_email = $keywords['Enquirer_Mail'] ?? __('Enquirer Mail');
        $data['subject'] = $request->subject;
        $data['fullname'] = $request->fullname;
        $data['email'] = $request->email;
        $data['body'] = "<div>$request->message</div><br>
                         <strong>$contact_remainder_message:</strong><br>
                         <strong>$enquirer_name:</strong> $request->fullname <br>
                         <strong>$enquirer_email:</strong> $request->email <br>
                         ";

        $mailer = new MegaMailer();
        $mailer->mailContactMessage($data);

        $successMessage = $keywords['Mail_sent_successfully'] ?? __('Mail sent successfully') . '.';
        Session::flash('success', $successMessage);

        return back();
    }

    public function adminContactMessage(Request $request)
    {

        $rules = [
            'name' => 'required',
            'email' => 'required|email:rfc,dns',
            'subject' => 'required',
            'message' => 'required'
        ];

        $bs = BS::select('is_recaptcha')->first();

        if ($bs->is_recaptcha == 1) {
            $rules['g-recaptcha-response'] = 'required|captcha';
        }
        $messages = [
            'g-recaptcha-response.required' => 'Please verify that you are not a robot.',
            'g-recaptcha-response.captcha' => 'Captcha error! try again later or contact site admin.',
        ];

        $request->validate($rules, $messages);

        $data['fromMail'] = $request->email;
        $data['fromName'] = $request->name;
        $data['subject'] = $request->subject;
        $data['body'] = "<div>$request->message</div><br>
        <strong>For further contact with the enquirer please use the below information:</strong><br>
        <strong>Enquirer Name:</strong> $request->name <br>
        <strong>Enquirer Mail:</strong> $request->email <br>
        ";
        $mailer = new MegaMailer();
        $mailer->mailToAdmin($data);
        Session::flash('success', 'Message sent successfully');
        return back();
    }

    public function userServices($domain)
    {
        $user = getUser();
        $id = $user->id;

        if (session()->has('user_lang')) {
            $userCurrentLang = UserLanguage::where('code', session()->get('user_lang'))->where('user_id', $user->id)->first();
            if (empty($userCurrentLang)) {
                $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
                session()->put('user_lang', $userCurrentLang->code);
            }
        } else {
            $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
        }

        $data['home_text'] = User\HomePageText::query()
            ->where([
                ['user_id', $id],
                ['language_id', $userCurrentLang->id]
            ])->first();

        $data['services'] = User\UserService::query()
            ->where('user_id', $id)
            ->where('lang_id', $userCurrentLang->id)
            ->orderBy('serial_number', 'ASC')
            ->get();
        return view('user-front.service.index', $data);
    }

    public function userServiceDetail($domain, $slug, $id)
    {
        $data['service'] = User\UserService::query()->findOrFail($id);
        return view('user-front.service.show', $data);
    }

    public function userBlogs(Request $request, $domain)
    {
        $user = getUser();
        $id = $user->id;
        $data['user'] = $user;
        $catid = $request->category;
        $term = $request->term;

        if (session()->has('user_lang')) {
            $userCurrentLang = UserLanguage::where('code', session()->get('user_lang'))->where('user_id', $user->id)->first();
            if (empty($userCurrentLang)) {
                $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
                session()->put('user_lang', $userCurrentLang->code);
            }
        } else {
            $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
        }

        $data['home_text'] = User\HomePageText::query()
            ->where([
                ['user_id', $id],
                ['language_id', $userCurrentLang->id]
            ])->first();


        $data['blogs'] = User\Blog::query()
            ->when($catid, function ($query, $catid) {
                return $query->where('category_id', $catid);
            })
            ->when($term, function ($query, $term) {
                return $query->where('title', 'LIKE', '%' . $term . '%');
            })
            ->where('user_id', $id)
            ->where('language_id', $userCurrentLang->id)
            ->orderBy('serial_number', 'ASC')
            ->paginate(4);

        $data['blog_categories'] = User\BlogCategory::query()
            ->where('status', 1)
            ->orderBy('serial_number', 'ASC')
            ->where('language_id', $userCurrentLang->id)
            ->where('user_id', $id)
            ->get();

        $data['allCount'] = User\Blog::query()
            ->where('user_id', $id)
            ->where('language_id', $userCurrentLang->id)
            ->count();

        if (Auth::guard('customer')->check() == true) {
            $authUser = Auth::guard('customer')->user();
            $data['bookmarkPosts'] = BookmarkPost::query()
                ->where('user_id', $authUser->id)
                ->where('author_id', $user->id)
                ->get();
        }
        return view('user-front.blog.index', $data);
    }
    public function userGallery(Request $request, $domain)
    {
        $user = getUser();
        $id = $user->id;
        $data['user'] = $user;
        $catid = $request->category;
        $term = $request->term;

        if (session()->has('user_lang')) {
            $userCurrentLang = UserLanguage::where('code', session()->get('user_lang'))->where('user_id', $user->id)->first();
            if (empty($userCurrentLang)) {
                $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
                session()->put('user_lang', $userCurrentLang->code);
            }
        } else {
            $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
        }

        $data['home_text'] = User\HomePageText::query()
            ->where([
                ['user_id', $id],
                ['language_id', $userCurrentLang->id]
            ])->first();


        $data['items'] = GalleryItem::where('language_id', $userCurrentLang->id)
            ->where('user_id', $user->id)
            ->orderBy('serial_number', 'asc')
            ->get();
        $data['galleryCategories'] = GalleryCategory::where('language_id', $userCurrentLang->id)
            ->where('user_id', $user->id)
            ->where('status', 1)
            ->orderBy('serial_number', 'asc')
            ->get();

        return view('user-front.gallery', $data);
    }

    public function userBlogDetail(Request $request, $domain, $slug, $id)
    {
        $user = getUser();
        $userId = $user->id;
        if (session()->has('user_lang')) {
            $userCurrentLang = UserLanguage::where('code', session()->get('user_lang'))->where('user_id', $user->id)->first();
            if (empty($userCurrentLang)) {
                $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
                session()->put('user_lang', $userCurrentLang->code);
            }
        } else {
            $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
        }

        $data['blog'] = UserBlog::query()->findOrFail($id);

        $data['latestBlogs'] = UserBlog::query()
            ->where('user_id', $userId)
            ->where('language_id', $userCurrentLang->id)
            ->orderBy('id', 'DESC')
            ->limit(3)->get();

        $data['blog_categories'] = User\BlogCategory::query()
            ->where('status', 1)
            ->orderBy('serial_number', 'ASC')
            ->where('language_id', $userCurrentLang->id)
            ->where('user_id', $userId)
            ->get();

        $data['mostViewedblogs'] = UserBlog::where('user_id', $user->id)
            ->where('language_id', $userCurrentLang->id)
            ->where('views', '!=', 0)
            ->orderByDesc('views')
            ->limit(5)
            ->get();

        $data['allCount'] = UserBlog::query()
            ->where('user_id', $userId)
            ->where('language_id', $userCurrentLang->id)
            ->count();
        $this->viewLog($request, $id, $user->id);
        return view('user-front.blog.show', $data);
    }
    
    public function makeBookmarkBlog($domain, $id)
    {
        $author = getUser();
        if (Auth::guard('customer')->check() == false) {
            Log::info("log not");
            return response()->json(['fail' => 'Please login before bookmark this post.']);
        } else {
            Log::info("log yes");
            $user = Auth::guard('customer')->user();
            $bookmarkInfo = $user->bookmarkList()->where('post_id', $id)->first();

            if (is_null($bookmarkInfo)) {
                $bookmarkPost = new BookmarkPost();
                $bookmarkPost->user_id = $user->id;
                $bookmarkPost->post_id = $id;
                $bookmarkPost->author_id = $author->id;
                $bookmarkPost->save();

                $postBookmarks = $this->countPostBookmark($id);

                return response()->json([
                    'success' => 'Post bookmarked successfully!',
                    'status' => 'bookmarked',
                    'postId' => $id,
                    'totalBookmark' => $postBookmarks
                ]);
            } else {
                $bookmarkInfo->delete();

                $postBookmarks = $this->countPostBookmark($id);

                return response()->json([
                    'success' => 'Bookmark removed successfully!',
                    'status' => 'removed',
                    'postId' => $id,
                    'totalBookmark' => $postBookmarks
                ]);
            }
        }
    }
    public function viewLog($request, $postId, $authorId)
    {
        $postViews = BlogView::where('post_id', $postId)->where('author_id', $authorId)->get();
        $ipAddress = $request->getClientIp();

        if (count($postViews) > 0) {
            foreach ($postViews as $view) {
                if (strcmp($view->ip, $ipAddress) == 0) {
                    return;
                }
            }
        }
        $postView = new BlogView();
        $postView->post_id = $postId;
        $postView->user_id = Auth::guard('customer')->check() == true ? Auth::guard('customer')->user()->id : null;
        $postView->author_id = $authorId;
        $postView->ip = $ipAddress;
        $postView->save();

        // count total views of this post
        $post = UserBlog::find($postId);
        $viewCount = BlogView::where('post_id', $postId)
            ->where('author_id', $authorId)
            ->count();

        $post->update(['views' => $viewCount]);
        return;
    }

    public function countPostBookmark($id)
    {
        // count total bookmarks of this post
        $post = UserBlog::find($id);
        $bookmarkCount = BookmarkPost::where('post_id', $id)->count();
        $post->update(['bookmarks' => $bookmarkCount]);
        return $post->bookmarks;
    }

    public function userPortfolios(Request $request, $domain)
    {
        $user = getUser();
        $id = $user->id;
        if (session()->has('user_lang')) {
            $userCurrentLang = UserLanguage::where('code', session()->get('user_lang'))->where('user_id', $user->id)->first();
            if (empty($userCurrentLang)) {
                $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
                session()->put('user_lang', $userCurrentLang->code);
            }
        } else {
            $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
        }

        $data['home_text'] = User\HomePageText::query()
            ->where([
                ['user_id', $id],
                ['language_id', $userCurrentLang->id]
            ])->first();
        $data['portfolio_categories'] = User\PortfolioCategory::query()
            ->where('status', 1)
            ->orderBy('serial_number', 'ASC')
            ->where('language_id', $userCurrentLang->id)
            ->where('user_id', $id)
            ->get();

        $data['catId'] = $request->category;

        $data['portfolios'] = User\Portfolio::query()
            ->where('user_id', $id)
            ->orderBy('serial_number', 'ASC')
            ->where('language_id', $userCurrentLang->id)
            ->get();
        return view('user-front.portfolio.index', $data);
    }

    public function userPortfolioDetail($domain, $slug, $id)
    {
        $user = getUser();
        $userId = $user->id;
        if (session()->has('user_lang')) {
            $userCurrentLang = UserLanguage::where('code', session()->get('user_lang'))->where('user_id', $user->id)->first();
            if (empty($userCurrentLang)) {
                $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
                session()->put('user_lang', $userCurrentLang->code);
            }
        } else {
            $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
        }

        $portfolio = User\Portfolio::query()->findOrFail($id);
        $catId = $portfolio->category_id;
        $data['relatedPortfolios'] = User\Portfolio::where('category_id', $catId)->where('id', '<>', $portfolio->id)->where('user_id', $userId)->orderBy('id', 'DESC')->limit(5);
        $data['portfolio'] = $portfolio;
        $data['portfolio_categories'] = User\PortfolioCategory::query()
            ->where('status', 1)
            ->where('language_id', $userCurrentLang->id)
            ->where('user_id', $userId)
            ->orderBy('serial_number', 'ASC')
            ->get();
        $data['allCount'] = User\Portfolio::where('language_id', $userCurrentLang->id)->where('user_id', $userId)->count();
        return view('user-front.portfolio.show', $data);
    }

    public function userJobs(Request $request, $domain)
    {
        $user = getUser();
        $id = $user->id;
        $data['user'] = $user;
        $cat_id = $request->category;
        $term = $request->term;

        if (session()->has('user_lang')) {
            $userCurrentLang = UserLanguage::where('code', session()->get('user_lang'))->where('user_id', $user->id)->first();
            if (empty($userCurrentLang)) {
                $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
                session()->put('user_lang', $userCurrentLang->code);
            }
        } else {
            $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
        }

        $data['home_text'] = User\HomePageText::query()
            ->where([
                ['user_id', $id],
                ['language_id', $userCurrentLang->id]
            ])->first();

        $data['jobs'] = User\Job::query()
            ->when($cat_id, function ($query, $cat_id) {
                return $query->where('jcategory_id', $cat_id);
            })
            ->when($term, function ($query, $term) {
                return $query->where('title', 'LIKE', '%' . $term . '%');
            })
            ->where('user_id', $id)
            ->where('language_id', $userCurrentLang->id)
            ->orderBy('serial_number', 'ASC')
            ->paginate(4);

        $data['job_categories'] = User\Jcategory::query()
            ->where('status', 1)
            ->orderBy('serial_number', 'ASC')
            ->where('language_id', $userCurrentLang->id)
            ->where('user_id', $id)
            ->get();

        $data['allCount'] = User\Job::query()
            ->where('user_id', $id)
            ->where('language_id', $userCurrentLang->id)
            ->count();
        return view('user-front.job.index', $data);
    }

    public function userJobDetail($domain, $slug, $id)
    {
        $user = getUser();
        $userId = $user->id;
        if (session()->has('user_lang')) {
            $userCurrentLang = UserLanguage::where('code', session()->get('user_lang'))->where('user_id', $user->id)->first();
            if (empty($userCurrentLang)) {
                $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
                session()->put('user_lang', $userCurrentLang->code);
            }
        } else {
            $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
        }

        $data['job'] = User\Job::query()->findOrFail($id);

        $data['latestJobs'] = User\Job::query()
            ->where('user_id', $userId)
            ->where('language_id', $userCurrentLang->id)
            ->orderBy('id', 'DESC')
            ->limit(3)->get();

        $data['job_categories'] = User\Jcategory::query()
            ->where('status', 1)
            ->orderBy('serial_number', 'ASC')
            ->where('language_id', $userCurrentLang->id)
            ->where('user_id', $userId)
            ->get();

        $data['allCount'] = User\Job::query()
            ->where('user_id', $userId)
            ->where('language_id', $userCurrentLang->id)
            ->count();
        return view('user-front.job.show', $data);
    }


    public function userTeam($domain)
    {
        $user = getUser();
        $id = $user->id;

        if (session()->has('user_lang')) {
            $userCurrentLang = UserLanguage::where('code', session()->get('user_lang'))->where('user_id', $user->id)->first();
            if (empty($userCurrentLang)) {
                $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
                session()->put('user_lang', $userCurrentLang->code);
            }
        } else {
            $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
        }

        $data['home_text'] = User\HomePageText::query()
            ->where([
                ['user_id', $id],
                ['language_id', $userCurrentLang->id]
            ])->first();

        $data['members'] = User\Member::query()
            ->where('user_id', $id)
            ->where('language_id', $userCurrentLang->id)
            ->get();
        return view('user-front.team', $data);
    }

    public function userFaqs($domain)
    {
        $user = getUser();
        $id = $user->id;
        if (session()->has('user_lang')) {
            $userCurrentLang = UserLanguage::where('code', session()->get('user_lang'))->where('user_id', $user->id)->first();
            if (empty($userCurrentLang)) {
                $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
                session()->put('user_lang', $userCurrentLang->code);
            }
        } else {
            $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
        }
        $data['home_text'] = User\HomePageText::query()
            ->where([
                ['user_id', $id],
                ['language_id', $userCurrentLang->id]
            ])->first();

        $data['faqs'] = User\FAQ::query()
            ->where('user_id', $id)
            ->where('language_id', $userCurrentLang->id)
            ->get();
        return view('user-front.faqs', $data);
    }
    public function quote($domain)
    {
        $user = getUser();
        if (session()->has('user_lang')) {
            $userCurrentLang = UserLanguage::where('code', session()->get('user_lang'))->where('user_id', $user->id)->first();
            if (empty($userCurrentLang)) {
                $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
                session()->put('user_lang', $userCurrentLang->code);
            }
        } else {
            $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
        }

        $bs = User\BasicSetting::where('user_id', $user->id)->first();

        if ($bs->is_quote == 0) {
            return view('errors.404');
        }

        $data['inputs'] = QuoteInput::where([
            ['language_id', $userCurrentLang->id],
            ['user_id', $user->id]
        ])->orderBy('order_number', 'ASC')->get();
        return view('user-front.quote', $data);
    }


    public function sendquote(Request $request, $domain)
    {

        $user = getUser();
        $keywords = getUserKeywords();

        if (session()->has('user_lang')) {
            $userCurrentLang = UserLanguage::where('code', session()->get('user_lang'))->where('user_id', $user->id)->first();
            if (empty($userCurrentLang)) {
                $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
                session()->put('user_lang', $userCurrentLang->code);
            }
        } else {
            $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
        }

        $quote_inputs = QuoteInput::where([
            ['language_id', $userCurrentLang->id],
            ['user_id', $user->id]
        ])->get();

        $rules = [
            'name' => 'required',
            'email' => 'required|email'
        ];

        $messages = [
            'name.required' => $keywords['name_required'] ?? __('Name is required') . '.',
            'email.required' => $keywords['email_required'] ?? __('Email is required') . '.',
            'email.email' => $keywords['email_invalid'] ?? __('Please enter a valid email address') . '.',
        ];

        $userBs = BasicSetting::where('user_id', $user->id)->first();
        if ($userBs->is_recaptcha == 1) {
            $rules['g-recaptcha-response'] = 'required|captcha';
        }

        $messages = array_merge($messages, [
            'g-recaptcha-response.required' => $keywords['g_recaptcha_response_required'] ?? __('Please verify that you are not a robot') . '.',
            'g-recaptcha-response.captcha' => $keywords['g_recaptcha_response_captcha'] ?? __('Captcha error! Try again later or contact site admin') . '.',
        ]);

        $allowedExts = array('zip');

        foreach ($quote_inputs as $input) {
            if ($input->required == 1) {
                $rules["$input->name"][] = 'required';
            }
            // check if input type is 5, then check for zip extension
            if ($input->type == 5) {
                $rules["$input->name"][] = function ($attribute, $value, $fail) use ($request, $input, $allowedExts, $keywords) {
                    if ($request->hasFile("$input->name")) {
                        $ext = $request->file("$input->name")->getClientOriginalExtension();
                        if (!in_array($ext, $allowedExts)) {
                            $fail($keywords['zip_file_only'] ?? __('Only zip file is allowed.') . '.');
                        }
                    }
                };
            }
        }

        $request->validate($rules, $messages);

        $fields = [];
        foreach ($quote_inputs as $key => $input) {
            $in_name = $input->name;
            // if the input is file, then move it to 'files' folder
            if ($input->type == 5) {
                if ($request->hasFile("$in_name")) {
                    $fileName = uniqid() . '.' . $request->file("$in_name")->getClientOriginalExtension();
                    $directory = public_path('assets/front/files/');
                    @mkdir($directory, 0775, true);
                    $request->file("$in_name")->move($directory, $fileName);

                    $fields["$in_name"]['value'] = $fileName;
                    $fields["$in_name"]['type'] = $input->type;
                }
            } else {
                if ($request["$in_name"]) {
                    $fields["$in_name"]['value'] = $request["$in_name"];
                    $fields["$in_name"]['type'] = $input->type;
                }
            }
        }
        $jsonfields = json_encode($fields);
        $jsonfields = str_replace("\/", "/", $jsonfields);


        $quote = new Quote;
        $quote->name = $request->name;
        $quote->email = $request->email;
        $quote->user_id = $user->id;
        $quote->fields = $jsonfields;

        $quote->save();

        $subject = $keywords['quote_request_subject'] ?? __('Quote Request Received');

        $be = BE::first();

        $mail = new PHPMailer(true);
        $mail->CharSet = "UTF-8";

        if ($be->is_smtp == 1) {
            try {
                //Server settings
                $mail->isSMTP();
                $mail->Host = $be->smtp_host;
                $mail->SMTPAuth = true;
                $mail->Username = $be->smtp_username;
                $mail->Password = $be->smtp_password;
                $mail->SMTPSecure = $be->encryption;
                $mail->Port = $be->smtp_port;
                $mail->CharSet = 'UTF-8';
                $mail->addReplyTo($request->email);
                //Recipients
                $mail->setFrom($be->from_mail, $request->name);
                $mail->addAddress($user->email);     // Add a recipient

            } catch (Exception $e) {
                Session::flash('error', $e->getMessage());
                return back();
            }
        } else {
            try {
                //Recipients
                $mail->setFrom($be->from_mail, $request->name);
                $mail->addReplyTo($request->email);
                $mail->addAddress($user->email);     // Add a recipient
            } catch (Exception $e) {
                Session::flash('error', $e->getMessage());
                return back();
            }
        }

        $quoteReceivedMsg = $keywords['quote_request_email_body_intro'] ?? __('You have received a new quote request.');
        $client_name = $keywords['quote_request_email_body_client_name'] ?? __('Client Name');
        $client_mail = $keywords['quote_request_email_body_client_mail'] ?? __('Client Mail');

        $message = '<div dir="ltr">' . $quoteReceivedMsg . '.<br/>' .
            '<strong dir="ltr">' . $client_name . ' - </strong><span dir="ltr">' . $request->name . '</span><br/>' .
            '<strong dir="ltr">' . $client_mail . ' - </strong><span dir="ltr">' . $request->email . '</span><br>' .
            '</div>';

        if (!empty($fields) && is_array($fields)) {
            foreach ($fields as $key => $field) {
                if ($field['type'] != 5) {
                    $message .= "<div><strong dir='ltr'>" . ucwords(str_replace("_", " ", $key)) . " - </strong>";
                    if (!is_array($field['value'])) {
                        $message .= "<span dir='ltr'>" . $field['value'] . "</span>";
                    } else {
                        $values = $field['value'];
                        $i = 0;
                        foreach ($values as $key => $value) {
                            $i++;
                            $message .= "<span dir='ltr'>" . $value . "</span>";
                            if (count($values) > $i) {
                                $message .= ", ";
                            }
                        }
                    }
                    $message .= "</div>";
                }
            }
        }
        $message .= "</div>";

        // Content
        $mail->isHTML(true);   // Set email format to HTML
        $mail->Subject = $subject;
        $mail->Body    = $message;

        $mail->send();

        $successMessage = $keywords['quote_request_sent_success'] ?? __('Quote request sent successfully');
        Session::flash('success', $successMessage);
        return back();
    }

    public function vcard($domain, $id)
    {
        $vcard = UserVcard::where('status', '=', 1)->findOrFail($id);
        $data['userBs'] = BasicSetting::select('is_recaptcha', 'google_recaptcha_site_key', 'google_recaptcha_secret_key')
            ->where('user_id', $vcard->user_id)->first();
        Config::set('captcha.sitekey', $data['userBs']->google_recaptcha_site_key);
        Config::set('captcha.secret', $data['userBs']->google_recaptcha_secret_key);

        $count = $vcard->user->memberships()->where('status', '=', 1)
            ->where('start_date', '<=', Carbon::now()->format('Y-m-d'))
            ->where('expire_date', '>=', Carbon::now()->format('Y-m-d'))
            ->count();
        // check if the vcard owner does not have membership
        if ($count == 0) {
            return view('errors.404');
        }

        $cFeatures = UserPermissionHelper::packagePermission($vcard->user_id);
        $cFeatures = json_decode($cFeatures, true);
        if (empty($cFeatures) || !is_array($cFeatures) || !in_array('vCard', $cFeatures)) {
            return view('errors.404');
        }

        $parsedUrl = parse_url(url()->current());
        $host = $parsedUrl['host'];
        // if the current host contains the website domain
        if (strpos($host, env('WEBSITE_HOST')) !== false) {
            $host = str_replace("www.", "", $host);
            // if the current URL is subdomain
            if ($host != env('WEBSITE_HOST')) {
                $hostArr = explode('.', $host);
                $username = $hostArr[0];
                if (strtolower($vcard->user->username) != strtolower($username) || !cPackageHasSubdomain($vcard->user)) {
                    return view('errors.404');
                }
            } else {
                $path = explode('/', $parsedUrl['path']);
                $username = $path[1];
                if (strtolower($vcard->user->username) != strtolower($username)) {
                    return view('errors.404');
                }
            }
        }
        // if the current host doesn't contain the website domain (meaning, custom domain)
        else {
            // Always include 'www.' at the begining of host
            if (substr($host, 0, 4) == 'www.') {
                $host = $host;
            } else {
                $host = 'www.' . $host;
            }
            // if the current package doesn't have 'custom domain' feature || the custom domain is not connected
            $cdomain = UserCustomDomain::where('requested_domain', '=', $host)->orWhere('requested_domain', '=', str_replace("www.", "", $host))->where('status', 1)->firstOrFail();
            $username = $cdomain->user->username;
            if (!cPackageHasCdomain($vcard->user) || ($username != $vcard->user->username)) {
                return view('errors.404');
            }
        }

        $infos = json_decode($vcard->information, true);

        $prefs = [];
        if (!empty($vcard->preferences)) {
            $prefs = json_decode($vcard->preferences, true);
        }

        $keywords = json_decode($vcard->keywords, true);

        $data['vcard'] = $vcard;
        $data['infos'] = $infos;
        $data['prefs'] = $prefs;
        $data['keywords'] = $keywords;
        if ($vcard->template == 1) {
            return view('vcard.index1', $data);
        } elseif ($vcard->template == 2) {
            return view('vcard.index2', $data);
        } elseif ($vcard->template == 3) {
            return view('vcard.index3', $data);
        } elseif ($vcard->template == 4) {
            return view('vcard.index4', $data);
        } elseif ($vcard->template == 5) {
            return view('vcard.index5', $data);
        } elseif ($vcard->template == 6) {
            return view('vcard.index6', $data);
        } elseif ($vcard->template == 7) {
            return view('vcard.index7', $data);
        } elseif ($vcard->template == 8) {
            return view('vcard.index8', $data);
        } elseif ($vcard->template == 9) {
            return view('vcard.index9', $data);
        } elseif ($vcard->template == 10) {
            return view('vcard.index10', $data);
        }
    }

    public function vcardImport($domain, $id)
    {
        $vcard = UserVcard::findOrFail($id);

        // define vcard
        $vcardObj = new VCard();

        // add personal data
        if (!empty($vcard->name)) {
            $vcardObj->addName($vcard->name);
        }
        if (!empty($vcard->company)) {
            $vcardObj->addCompany($vcard->company);
        }
        if (!empty($vcard->occupation)) {
            $vcardObj->addJobtitle($vcard->occupation);
        }
        if (!empty($vcard->email)) {
            $vcardObj->addEmail($vcard->email);
        }
        if (!empty($vcard->phone)) {
            $vcardObj->addPhoneNumber($vcard->phone, 'WORK');
        }
        if (!empty($vcard->address)) {
            $vcardObj->addAddress($vcard->address);
            $vcardObj->addLabel($vcard->address);
        }
        if (!empty($vcard->website_url)) {
            $vcardObj->addURL($vcard->website_url);
        }

        $vcardObj->addPhoto(public_path('assets/front/img/user/vcard/' . $vcard->profile_image));

        return \Response::make(
            $vcardObj->getOutput(),
            200,
            $vcardObj->getHeaders(true)
        );
    }

    public function changeLanguage($lang): \Illuminate\Http\RedirectResponse
    {
        session()->put('lang', $lang);
        app()->setLocale($lang);
        return redirect()->route('front.index');
    }
    public function changeUserLanguage(Request $request, $domain)
    {
        $validLanguages = UserLanguage::where('user_id', getUser()->id)
            ->pluck('code')
            ->toArray();

        if (in_array($request->code, $validLanguages)) {
            session()->put('user_lang', $request->code);
        }

        return redirect()->route('front.user.detail.view', $domain);
    }

    // public function changeUserLanguage(Request $request, $domain): \Illuminate\Http\RedirectResponse
    // {
    //     dd(getUser()->id);
    //     session()->put('user_lang', $request->code);
    //     return redirect()->route('front.user.detail.view', $domain);
    // }

    public function userCPage($param, $slug)
    {
        $user = getUser();
        $userId = $user->id;
        if (session()->has('user_lang')) {
            $userCurrentLang = UserLanguage::where('code', session()->get('user_lang'))->where('user_id', $user->id)->first();
            if (empty($userCurrentLang)) {
                $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
                session()->put('user_lang', $userCurrentLang->code);
            }
        } else {
            $userCurrentLang = UserLanguage::where('is_default', 1)->where('user_id', $user->id)->first();
        }

        $data['page'] = User\Page::query()->where('user_id', $userId)->where('language_id', $userCurrentLang->id)->where('slug', $slug)->firstOrFail();

        return view('user-front.custom-page', $data);
    }
}
