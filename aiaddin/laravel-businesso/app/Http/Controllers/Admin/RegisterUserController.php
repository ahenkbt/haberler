<?php

namespace App\Http\Controllers\Admin;

use Carbon\Carbon;
use App\Models\User;
use App\Models\Package;
use App\Models\User\Menu;
use App\Models\Membership;
use App\Constants\Constant;
use App\Models\BasicSetting;
use Illuminate\Http\Request;
use App\Models\BasicExtended;
use App\Models\User\Language;
use App\Http\Helpers\Uploader;
use App\Models\OfflineGateway;
use App\Models\PaymentGateway;
use App\Http\Helpers\MegaMailer;
use App\Models\User\HomeSection;
use App\Models\User\HomePageText;
use Illuminate\Support\Facades\DB;
use App\Models\User\UserPermission;
use App\Http\Controllers\Controller;
use App\Models\User\UserShopSetting;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Models\User\UserEmailTemplate;
use Illuminate\Support\Facades\Config;
use App\Models\User\UserPaymentGeteway;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Validator;
use App\Http\Helpers\UserPermissionHelper;
use App\Models\Language as ModelsLanguage;
use App\Models\User\BasicSetting as UserBasicSetting;

class RegisterUserController extends Controller
{
    public function __construct()
    {
        $abs = BasicSetting::first();
        Config::set('app.timezone', $abs->timezone);
    }

    public function index(Request $request)
    {
        $term = $request->term;

        $users = User::when($term, function ($query, $term) {
            $query->where('username', 'like', '%' . $term . '%')->orWhere('email', 'like', '%' . $term . '%');
        })
            ->orderBy('id', 'DESC')
            ->paginate(10);

        $online = PaymentGateway::query()->where('status', 1)->get();
        $offline = OfflineGateway::where('status', 1)->get();
        $gateways = $online->merge($offline);
        $packages = Package::query()->where('status', '1')->get();

        return view('admin.register_user.index', compact('users', 'gateways', 'packages'));
    }

    public function view($id)
    {
        $user = User::findOrFail($id);
        $packages = Package::query()->where('status', '1')->get();

        $online = PaymentGateway::query()->where('status', 1)->get();
        $offline = OfflineGateway::where('status', 1)->get();
        $gateways = $online->merge($offline);

        return view('admin.register_user.details', compact('user', 'packages', 'gateways'));
    }

    public function store(Request $request)
    {
        $rules = [
            'username' => 'required|alpha_num|unique:users',
            'email' => 'required|email|unique:users',
            'password' => 'required|confirmed',
            'package_id' => 'required',
            'payment_gateway' => 'required',
            'online_status' => 'required',
        ];

        $messages = [
            'package_id.required' => 'The package field is required',
            'online_status.required' => 'The publicly hidden field is required',
        ];

        $validator = Validator::make($request->all(), $rules, $messages);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }

        //dynamic language translate wise menu
        $deLang = User\Language::firstOrFail();
        $deLanguageNames = json_decode($deLang->keywords, true);

        $menus = '[
            {"text":"Home","href":"","icon":"empty","target":"_self","title":"","type":"home"},

            {"text":"About","href":"","icon":"empty","target":"_self","title":"","type":"custom","children":[{"text":"Team","href":"","icon":"empty","target":"_self","title":"","type":"team"},
            {"text":"Career","href":"","icon":"empty","target":"_self","title":"","type":"career"},
            {"text":"FAQ","href":"","icon":"empty","target":"_self","title":"","type":"faq"}]},

            {"text":"Services","href":"","icon":"empty","target":"_self","title":"","type":"services"},
            {"text":"Portfolios","href":"","icon":"empty","target":"_self","title":"","type":"portfolios"},
            {"type":"shop","text":"Shop","href":"","target":"_self"},
            {"text":"Blog","href":"","icon":"empty","target":"_self","title":"","type":"blog"},
            {"text":"Contact","href":"","icon":"empty","target":"_self","title":"","type":"contact"}]';

        $menus = json_decode($menus, true);
        foreach (array_column($menus, 'text') as $key => $menu) {
            if ($menu == 'Home' && array_key_exists($menu, $deLanguageNames)) {
                $menus[$key]['text'] = $deLanguageNames[$menu];
            }
            if ($menu == 'About') {
                $menus[$key]['text'] = array_key_exists('About', $deLanguageNames) ? $deLanguageNames['About'] : 'About';
                //if children manus exits
                if (count($menus[$key]['children']) > 0) {
                    $arrays = $menus[$key]['children'];
                    foreach (array_column($arrays, 'text') as $k => $value) {
                        if ($value == 'Team' && array_key_exists($value, $deLanguageNames)) {
                            $menus[$key]['children'][$k]['text'] = $deLanguageNames[$value];
                        }
                        if ($value == 'Career' && array_key_exists($value, $deLanguageNames)) {
                            $menus[$key]['children'][$k]['text'] = $deLanguageNames[$value];
                        }
                        if ($value == 'FAQ' && array_key_exists($value, $deLanguageNames)) {
                            $menus[$key]['children'][$k]['text'] = $deLanguageNames[$value];
                        }
                    }
                }
                //end children manus exits
            }
            if ($menu == 'Services' && array_key_exists($menu, $deLanguageNames)) {
                $menus[$key]['text'] = $deLanguageNames[$menu];
            }
            if ($menu == 'Portfolios' && array_key_exists($menu, $deLanguageNames)) {
                $menus[$key]['text'] = $deLanguageNames[$menu];
            }
            if ($menu == 'Shop' && array_key_exists($menu, $deLanguageNames)) {
                $menus[$key]['text'] = $deLanguageNames[$menu];
            }
            if ($menu == 'Blog' && array_key_exists($menu, $deLanguageNames)) {
                $menus[$key]['text'] = $deLanguageNames[$menu];
            }
            if ($menu == 'Contact' && array_key_exists($menu, $deLanguageNames)) {
                $menus[$key]['text'] = $deLanguageNames[$menu];
            }
        }
        $menus = json_encode($menus);
        $user = User::where('username', $request['username']);
        if ($user->count() == 0) {
            $user = User::create([
                'email' => $request['email'],
                'username' => $request['username'],
                'password' => bcrypt($request['password']),
                'online_status' => $request['online_status'],
                'status' => 1,
                'email_verified' => 1,
            ]);

            UserBasicSetting::create([
                'theme' => 'home_one',
                'user_id' => $user->id,
                'timezone' => 1,
            ]);

            // user shop settings create

            UserShopSetting::create([
                'user_id' => $user->id,
                'is_shop' => 1,
                'catalog_mode' => 0,
                'item_rating_system' => 1,
                'tax' => 0,
            ]);

            $homeSection = new HomeSection();
            $homeSection->user_id = $user->id;
            $homeSection->save();
        }

        if ($user) {
            // $deLang = Language::firstOrFail();
            $langCount = Language::where('user_id', $user->id)
                ->where('is_default', 1)
                ->count();
            $adminLangs = ModelsLanguage::get();
            if ($langCount == 0) {
                $first = true;
                foreach ($adminLangs as $lang) {
                   
                    $language = Language::create([
                        'name' => $lang->name,
                        'code' => $lang->code,
                        'is_default' => $first ? 1 : 0,
                        'dashboard_default' => $first ? 1 : 0,
                        'rtl' => $lang->rtl,
                        'user_id' => $user->id,
                        'keywords' => $lang->customer_keywords,
                    ]);

                    $htext = new HomePageText();
                    $htext->language_id = $language->id;
                    $htext->user_id = $user->id;
                    $htext->save();

                    $umenu = new Menu();
                    $umenu->language_id = $language->id;
                    $umenu->user_id = $user->id;

                    $umenu->menus = $menus;
                    $umenu->save();
                    $first = false;
                }
                
            }

            $package = Package::find($request['package_id']);
            $be = BasicExtended::first();
            $bs = BasicSetting::select('website_title')->first();
            $transaction_id = UserPermissionHelper::uniqidReal(8);

            $startDate = Carbon::today()->format('Y-m-d');
            if ($package->term === 'monthly') {
                $endDate = Carbon::today()->addMonth()->format('Y-m-d');
            } elseif ($package->term === 'yearly') {
                $endDate = Carbon::today()->addYear()->format('Y-m-d');
            } elseif ($package->term === 'lifetime') {
                $endDate = Carbon::maxValue()->format('d-m-Y');
            }

            Membership::create([
                'price' => $package->price,
                'currency' => $be->base_currency_text ? $be->base_currency_text : 'USD',
                'currency_symbol' => $be->base_currency_symbol ? $be->base_currency_symbol : $be->base_currency_text,
                'payment_method' => $request['payment_gateway'],
                'transaction_id' => $transaction_id ? $transaction_id : 0,
                'status' => 1,
                'is_trial' => 0,
                'trial_days' => 0,
                'receipt' => $request['receipt_name'] ? $request['receipt_name'] : null,
                'transaction_details' => null,
                'settings' => json_encode($be),
                'package_id' => $request['package_id'],
                'user_id' => $user->id,
                'start_date' => Carbon::parse($startDate),
                'expire_date' => Carbon::parse($endDate),
            ]);
            $package = Package::findOrFail($request['package_id']);
            $features = json_decode($package->features, true);
            $features[] = 'Contact';
            UserPermission::create([
                'package_id' => $request['package_id'],
                'user_id' => $user->id,
                'permissions' => json_encode($features),
            ]);

            // create payment gateways
            $payment_keywords = ['flutterwave', 'razorpay', 'paytm', 'paystack', 'instamojo', 'stripe', 'paypal', 'mollie', 'mercadopago', 'authorize.net', 'phonepe'];
            foreach ($payment_keywords as $key => $value) {
                UserPaymentGeteway::create([
                    'title' => null,
                    'user_id' => $user->id,
                    'details' => null,
                    'keyword' => $value,
                    'subtitle' => null,
                    'name' => ucfirst($value),
                    'type' => 'automatic',
                    'information' => null,
                ]);
            }

            // create email template
            $templates = ['email_verification', 'product_order', 'reset_password', 'room_booking', 'payment_received', 'payment_cancelled', 'course_enrolment', 'course_enrolment_approved', 'course_enrolment_rejected', 'donation', 'donation_approved'];
            foreach ($templates as $key => $val) {
                UserEmailTemplate::create([
                    'user_id' => $user->id,
                    'email_type' => $val,
                    'email_subject' => null,
                    'email_body' => '<p></p>',
                ]);
            }

            $requestData = [
                'start_date' => $startDate,
                'expire_date' => $endDate,
                'payment_method' => $request['payment_gateway'],
            ];
            $lastMemb = $user->memberships()->orderBy('id', 'DESC')->first();
            $file_name = $this->makeInvoice($requestData, 'membership', $user, null, $package->price, $request['payment_gateway'], null, $be->base_currency_symbol_position, $be->base_currency_symbol, $be->base_currency_text, $transaction_id, $package->title, $lastMemb);

            $mailer = new MegaMailer();
            $startDate = Carbon::parse($startDate);
            $endDate = Carbon::parse($endDate);
            $data = [
                'toMail' => $user->email,
                'toName' => $user->fname,
                'username' => $user->username,
                'package_title' => $package->title,
                'package_price' => ($be->base_currency_text_position == 'left' ? $be->base_currency_text . ' ' : '') . $package->price . ($be->base_currency_text_position == 'right' ? ' ' . $be->base_currency_text : ''),
                'activation_date' => $startDate->toFormattedDateString(),
                'expire_date' => $endDate->toFormattedDateString(),
                'membership_invoice' => $file_name,
                'website_title' => $bs->website_title,
                'templateType' => 'registration_with_premium_package',
                'type' => 'registrationWithPremiumPackage',
            ];
            $mailer->mailFromAdmin($data);
        }
        Session::flash('success', __('User added successfully!'));
        return 'success';
    }

    public function secretLogin(Request $request)
    {
       
        $user = User::where('id', $request->user_id)->first();
        if (Auth::guard('web')->login($user, true)) {
            return redirect()->route('user-dashboard')->withSuccess(__('You have Successfully loggedin'));
        }
        return redirect('login')->withSuccess(__('Oppes! You have entered invalid credentials'));
    }
    public function userban(Request $request)
    {
        $user = User::where('id', $request->user_id)->first();
        $user->update([
            'status' => $request->status,
        ]);
        Session::flash('success', __('Status update successfully!'));
        return back();
    }

    public function emailStatus(Request $request)
    {
        $user = User::findOrFail($request->user_id);
        $user->update([
            'email_verified' => $request->email_verified,
        ]);
        Session::flash('success', __('Email status updated for'). ' ' . $user->username);
        return back();
    }

    public function userFeatured(Request $request)
    {
        $user = User::where('id', $request->user_id)->first();
        $user->featured = $request->featured;
        $user->save();
        Session::flash('success', __('User featured update successfully!'));
        return back();
    }

    public function changePass($id)
    {
        $data['user'] = User::findOrFail($id);
        return view('admin.register_user.password', $data);
    }

    public function updatePassword(Request $request)
    {

        $request->validate(
            [
                'new_password' => 'required',
                'confirm_password' => 'required',
            ],

        );

        $user = User::findOrFail($request->user_id);
        if ($request->new_password == $request->confirm_password) {
            $input['password'] = Hash::make($request->new_password);
        } else {
            return back()->with('warning', __('Confirm password does not match.'));
        }

        $user->update($input);

        Session::flash('success', __('Password update for'). ' ' . $user->username);
        return back();
    }

    public function delete(Request $request)
    {
        $user = User::findOrFail($request->user_id);
        $causes = $user->causes()->get();
        $causeCategories = $user->causeCategories()->get();
        $causesContent = $user->causesContent()->get();
        $donationDetails = $user->donationDetails()->get();

        DB::table('user_donation_settings')
            ->where('user_id', $user->id)
            ->delete();
        if (!empty($causes) && count($causes) > 0) {
            foreach ($causes as $cause) {
                @unlink(public_path(Constant::WEBSITE_CAUSE_IMAGE . '/' . $cause->image));
                $cause->delete();
            }
        }
        if (!empty($causeCategories) && count($causeCategories) > 0) {
            foreach ($causeCategories as $cate) {
                @unlink(public_path(Constant::WEBSITE_CAUSE_CATEGORY_IMAGE . '/' . $cate->image));
                $cate->delete();
            }
        }
        if (!empty($donationDetails) && count($donationDetails) > 0) {
            foreach ($donationDetails as $donation_detail) {
                if (!is_null($donation_detail->receipt)) {
                    $directory = public_path(Constant::WEBSITE_DONATION_ATTACHMENT . '/' . $donation_detail->receipt);
                    if (file_exists($directory)) {
                        @unlink($directory);
                    }
                }
                if (!is_null($donation_detail->invoice)) {
                    $directory = public_path(Constant::WEBSITE_DONATION_INVOICE . '/' . $donation_detail->invoice);
                    if (file_exists($directory)) {
                        @unlink($directory);
                    }
                }

                $donation_detail->delete();
            }
        }

        if (!empty($causesContent) && count($causesContent) > 0) {
            foreach ($causesContent as $cont) {
                $cont->delete();
            }
        }
        //start  course management informnation delete
        $courses = $user->courses;
        $instructors = $user->courseInstructtors()->get();

        if (!empty($courses) && count($courses) > 0) {
            foreach ($courses as $course) {
                // enrollment delete
                $totalEnrolment = $course->enrolment;

                foreach ($totalEnrolment as $enrolment) {
                    if (!empty($enrolment->invoice)) {
                        Uploader::remove(Constant::WEBSITE_ENROLLMENT_INVOICE, $enrolment->invoice);
                    }
                    if (!empty($enrolment->attachment)) {
                        Uploader::remove(Constant::WEBSITE_ENROLLMENT_ATTACHMENT, $enrolment->invoice);
                    }
                    $enrolment->delete();
                }

                // get all the course information's of this course
                $courseInformations = $course
                    ->courseInformation()
                    ->where('user_id', $user->id)
                    ->get();

                foreach ($courseInformations as $courseInformation) {
                    // get all the modules of each course-information
                    $modules = $courseInformation->module()->get();

                    foreach ($modules as $module) {
                        // get all the lessons of each module
                        $lessons = $module->lesson()->get();

                        foreach ($lessons as $lesson) {
                            // get all the lesson contents of each lesson
                            $lessonContents = $lesson->content()->get();

                            foreach ($lessonContents as $lessonContent) {
                                // delete lesson content item by checking the 'type'
                                if ($lessonContent->type == 'video') {
                                    Uploader::remove(Constant::WEBSITE_LESSON_CONTENT_VIDEO, $lessonContent->video_unique_name);
                                } elseif ($lessonContent->type == 'file') {
                                    Uploader::remove(Constant::WEBSITE_LESSON_CONTENT_FILE, $lessonContent->file_unique_name);
                                } elseif ($lessonContent->type == 'quiz') {
                                    // get all the lesson quizzes of this lesson-content
                                    $lessonQuizzes = $lessonContent->quiz()->get();
                                    foreach ($lessonQuizzes as $lessonQuiz) {
                                        $lessonQuiz->delete();
                                    }
                                }
                                $lessonContent->delete();
                            }
                            $lesson->delete();
                        }
                        $module->delete();
                    }

                    $courseInformation->delete();
                }
                Uploader::remove(Constant::WEBSITE_COURSE_THUMBNAIL_IMAGE, $course->thumbnail_image);
                Uploader::remove(Constant::WEBSITE_COURSE_COVER_IMAGE, $course->cover_image);

                // get all the faqs of this course
                $courseFaqs = $course->faq()->get();
                foreach ($courseFaqs as $courseFaq) {
                    $courseFaq->delete();
                }

                // get all the reviews of this course
                $reviews = $course->review()->get();
                foreach ($reviews as $review) {
                    $review->delete();
                }
                // get all the quiz-scores of this course
                $quizScores = $course->quizScore()->get();
                foreach ($quizScores as $quizScore) {
                    $quizScore->delete();
                }
                // finally, delete the course
                $course->delete();
            }
        }
        if (!empty($user->courseCategory()) && $user->courseCategory()->count() > 0) {
            $user->courseCategory()->delete();
        }
        if (!empty($user->courseCoupon()) && $user->courseCoupon()->count() > 0) {
            $user->courseCoupon()->delete();
        }

        if (!empty($user->lessonComplete()) && $user->lessonComplete()->count() > 0) {
            $user->lessonComplete()->delete();
        }
        if (!empty($user->lessonContentComplete()) && $user->lessonContentComplete()->count() > 0) {
            $user->lessonContentComplete()->delete();
        }

        if (!empty($instructors) && count($instructors) > 0) {
            foreach ($instructors as $key => $ins) {
                @unlink(public_path(Constant::WEBSITE_INSTRUCTOR_IMAGE . '/' . $ins->image));
                $ins->socialPlatform()->delete();
                $ins->delete();
            }
        }
        //end course management informnation delete

        // hotel management content delete
        $rooms = $user->rooms()->get();
        $roomBookings = $user->roomBookings()->get();
        $roomContents = $user->roomContents();
        $roomCategories = $user->roomCategories();
        $roomCoupns = $user->roomCoupns();
        $roomAmenities = $user->roomAmenities();
        $roomReviews = $user->rommReviews();

        if (!empty($rooms) && $rooms->count() > 0) {
            DB::table('user_room_settings')
                ->where('user_id', $user->id)
                ->delete();
            foreach ($rooms as $room) {
                if (!is_null($room->slider_imgs)) {
                    $images = json_decode($room->slider_imgs);

                    foreach ($images as $image) {
                        if (file_exists('assets/img/rooms/slider_images/' . $image)) {
                            @unlink('assets/img/rooms/slider_images/' . $image);
                        }
                    }
                }

                if (!is_null($room->featured_img) && file_exists('assets/img/rooms/' . $room->featured_img)) {
                    @unlink('assets/img/rooms/' . $room->featured_img);
                }
                $room->delete();
            }
        }
        if ($roomBookings->count() > 0) {
            foreach ($roomBookings as $roomBooking) {
                @unlink(public_path('assets/img/attachments/rooms/') . $roomBooking->attachment);
                @unlink(public_path('assets/invoices/rooms/') . $roomBooking->invoice);
                $roomBooking->delete();
            }
        }

        if (!empty($roomContents) && $roomContents->count() > 0) {
            $roomContents->delete();
        }
        if (!empty($roomCategories) && $roomCategories->count() > 0) {
            $roomCategories->delete();
        }
        if (!empty($roomCoupns) && $roomCoupns->count() > 0) {
            $roomCoupns->delete();
        }
        if (!empty($roomAmenities) && $roomAmenities->count() > 0) {
            $roomAmenities->delete();
        }
        if (!empty($roomReviews) && $roomReviews->count() > 0) {
            $roomReviews->delete();
        }

        if (!empty($user->testimonials()) && $user->testimonials()->count() > 0) {
            $testimonials = $user->testimonials()->get();
            foreach ($testimonials as $key => $tstm) {
                @unlink(public_path('assets/front/img/user/testimonials/' . $tstm->image));
                $tstm->delete();
            }
        }

        if (!empty($user->social_media()) && $user->social_media()->count() > 0) {
            $user->social_media()->delete();
        }

        if (!empty($user->templates()) && $user->templates()->count() > 0) {
            $user->templates()->delete();
        }

        if (!empty($user->skills()) && $user->skills()->count() > 0) {
            $user->skills()->delete();
        }

        if (!empty($user->services()) && $user->services()->count() > 0) {
            $services = $user->services()->get();
            foreach ($services as $key => $service) {
                @unlink('assets/front/img/user/services/' . $service->image);
                $service->delete();
            }
        }

        if (!empty($user->subscribers()) && $user->subscribers()->count() > 0) {
            $user->subscribers()->delete();
        }

        if (!empty($user->seos()) && $user->seos()->count() > 0) {
            $user->seos()->delete();
        }

        if (!empty($user->portfolios()) && $user->portfolios()->count() > 0) {
            $portfolios = $user->portfolios()->get();
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

        if (!empty($user->portfolioCategories()) && $user->portfolioCategories()->count() > 0) {
            $user->portfolioCategories()->delete();
        }

        if (!empty($user->permission()) && $user->permission()->count() > 0) {
            $user->permission()->delete();
        }

        if (!empty($user->languages()) && $user->languages()->count() > 0) {
            $user->languages()->delete();
        }

        if (!empty($user->home_page_texts()) && $user->home_page_texts()->count() > 0) {
            $homeTexts = $user->home_page_texts()->get();
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

        if (!empty($user->home_section()) && $user->home_section()->count() > 0) {
            $user->home_section()->delete();
        }

        if (!empty($user->jobs()) && $user->jobs()->count() > 0) {
            $user->jobs()->delete();
        }

        if (!empty($user->jcategories()) && $user->jcategories()->count() > 0) {
            $user->jcategories()->delete();
        }

        if (!empty($user->teams()) && $user->teams()->count() > 0) {
            $teams = $user->teams()->get();
            foreach ($teams as $key => $team) {
                @unlink(public_path('/assets/front/img/user/team/' . $team->image));
                $team->delete();
            }
        }

        if (!empty($user->permissions()) && $user->permissions()->count() > 0) {
            $user->permissions()->delete();
        }

        if (!empty($user->qr_codes()) && $user->qr_codes()->count() > 0) {
            $qr_codes = $user->qr_codes()->get();
            foreach ($qr_codes as $key => $qr) {
                @unlink(public_path('assets/front/img/user/qr/' . $qr->image));
                $qr->delete();
            }
        }

        if (!empty($user->quotes()) && $user->quotes()->count() > 0) {
            $user->quotes()->delete();
        }

        if (!empty($user->quote_inputs()) && $user->quote_inputs()->count() > 0) {
            $quote_inputs = $user->quote_inputs()->get();
            foreach ($quote_inputs as $key => $input) {
                if ($input->quote_input_options()->count() > 0) {
                    $input->quote_input_options()->delete();
                }
                $input->delete();
            }
        }

        if (!empty($user->services()) && $user->services()->count() > 0) {
            $services = $user->services()->get();
            foreach ($services as $key => $service) {
                @unlink(public_path('assets/front/img/user/service/' . $service->image));
                $service->delete();
            }
        }

        if (!empty($user->vcards()) && $user->vcards()->count() > 0) {
            $vcards = $user->vcards()->get();
            foreach ($vcards as $key => $vcard) {
                @unlink(public_path('assets/front/img/user/vcard/' . $vcard->profile_image));
                @unlink(public_path('assets/front/img/user/vcard/' . $vcard->cover_image));
                if ($vcard->user_vcard_projects()->count() > 0) {
                    foreach ($vcard->user_vcard_projects as $key => $project) {
                        @unlink(public_path('assets/front/img/user/projects/' . $project->image));
                        $project->delete();
                    }
                }
                if ($vcard->user_vcard_services()->count() > 0) {
                    foreach ($vcard->user_vcard_services as $key => $service) {
                        @unlink(public_path('assets/front/img/user/services/' . $service->image));
                        $service->delete();
                    }
                }
                if ($vcard->user_vcard_testimonials()->count() > 0) {
                    foreach ($vcard->user_vcard_testimonials as $key => $testimonial) {
                        @unlink(public_path('assets/front/img/user/testimonials/' . $testimonial->image));
                        $testimonial->delete();
                    }
                }
                $vcard->delete();
            }
        }

        if (!empty($user->processes()) && $user->processes()->count() > 0) {
            $user->processes()->delete();
        }

        if (!empty($user->blog_categories()) && $user->blog_categories()->count() > 0) {
            $user->blog_categories()->delete();
        }

        if (!empty($user->blogs()) && $user->blogs()->count() > 0) {
            $blogs = $user->blogs()->get();
            foreach ($blogs as $key => $blog) {
                @unlink(public_path('assets/front/img/user/blogs/' . $blog->image));
                $blog->delete();
            }
        }

        if (!empty($user->basic_setting()) && $user->basic_setting()->count() > 0) {
            $bs = $user->basic_setting;
            @unlink(public_path('assets/front/img/user/' . $bs->breadcrumb));
            @unlink(public_path('assets/front/img/user/' . $bs->logo));
            @unlink(public_path('assets/front/img/user/' . $bs->preloader));
            @unlink(public_path('assets/front/img/user/' . $bs->favicon));
            @unlink(public_path('assets/front/img/user/qr/' . $bs->qr_image));
            @unlink(public_path('assets/front/img/user/qr/' . $bs->qr_inserted_image));
            $bs->delete();
        }

        if (!empty($user->memberships()) && $user->memberships()->count() > 0) {
            foreach ($user->memberships as $key => $membership) {
                @unlink(public_path('assets/front/img/membership/receipt/' . $membership->receipt));
                $membership->delete();
            }
        }

        if (!empty($user->brands()) && $user->brands()->count() > 0) {
            $brands = $user->brands()->get();
            foreach ($brands as $key => $brand) {
                @unlink(public_path('assets/front/img/user/brands/' . $brand->brand_img));
                $brand->delete();
            }
        }

        if (!empty($user->user_contact()) && $user->user_contact()->count() > 0) {
            $contact = $user->user_contact;
            @unlink(public_path('assets/front/img/user/' . $contact->contact_form_image));
            $contact->delete();
        }

        if (!empty($user->faqs()) && $user->faqs()->count() > 0) {
            $user->faqs()->delete();
        }

        if (!empty($user->footer_quick_links()) && $user->footer_quick_links()->count() > 0) {
            $user->footer_quick_links()->delete();
        }

        if (!empty($user->footer_texts()) && $user->footer_texts()->count() > 0) {
            $user->footer_texts()->delete();
        }

        if (!empty($user->menus()) && $user->menus()->count() > 0) {
            $user->menus()->delete();
        }

        if (!empty($user->pages()) && $user->pages()->count() > 0) {
            $user->pages()->delete();
        }

        if (!empty($user->hero_sliders()) && $user->hero_sliders()->count() > 0) {
            $sliders = $user->hero_sliders()->get();
            foreach ($sliders as $key => $slider) {
                @unlink(public_path('assets/front/img/hero_slider/' . $slider->img));
                $slider->delete();
            }
        }

        if (!empty($user->hero_static()) && $user->hero_static()->count() > 0) {
            $static = $user->hero_static;
            @unlink(public_path('assets/front/img/hero_static/' . $static->img));
            $static->delete();
        }

        if (!empty($user->customers()) && $user->customers()->count() > 0) {
            $customers = $user->customers()->get();
            foreach ($customers as $key => $customer) {
                @unlink(public_path('assets/admin/img/propics/' . $customer->image));
                $customer->delete();
            }
        }
        if (!empty($user->user_features()) && $user->user_features()->count() > 0) {
            $user_features = $user->user_features()->get();
            foreach ($user_features as $key => $feat) {
                @unlink(public_path('assets/front/img/user/feature/' . $feat->icon));
                $feat->delete();
            }
        }
        if (!empty($user->user_items()) && $user->user_items()->count() > 0) {
            $user_items = $user->user_items()->get();
            foreach ($user_items as $key => $item) {
                @unlink(public_path('assets/front/img/user/items/thumbnail/' . $item->thumbnail));
                foreach ($item->sliders as $key => $image) {
                    @unlink(public_path('assets/front/img/user/items/slider-images/' . $image->image));
                    $image->delete();
                }
                $item->itemContents()->delete();
                $item->delete();
            }
        }
        if (!empty($user->user_item_categories()) && $user->user_item_categories()->count() > 0) {
            $user_item_categories = $user->user_item_categories()->get();
            foreach ($user_item_categories as $key => $category) {
                @unlink(public_path('assets/front/img/user/items/categories/' . $category->image));
                $category->subcategories()->delete();
            }
        }
        if (!empty($user->user_offer_banners()) && $user->user_offer_banners()->count() > 0) {
            $user_offer_banners = $user->user_offer_banners()->get();
            foreach ($user_offer_banners as $key => $banner) {
                @unlink(public_path('assets/front/img/user/offers/' . $banner->image));
            }
        }
        if (!empty($user->user_coupons()) && $user->user_coupons()->count() > 0) {
            $user->user_coupons()->delete();
        }
        if (!empty($user->user_item_subcategories()) && $user->user_item_subcategories()->count() > 0) {
            $user->user_item_subcategories()->delete();
        }
        if (!empty($user->user_offline_gateways()) && $user->user_offline_gateways()->count() > 0) {
            $user->user_offline_gateways()->delete();
        }
        if (!empty($user->user_orders()) && $user->user_orders()->count() > 0) {
            $user->user_orders()->delete();
        }
        if (!empty($user->user_payment_gateways()) && $user->user_payment_gateways()->count() > 0) {
            $user->user_payment_gateways()->delete();
        }
        if (!empty($user->user_shipping_charges()) && $user->user_shipping_charges()->count() > 0) {
            $user->user_shipping_charges()->delete();
        }
        if (!empty($user->user_shop_settings) && $user->user_shop_settings->count() > 0) {
            $user->user_shop_settings->delete();
        }

        // assets/front/invoices/', 0775, true
        @unlink(public_path('assets/front/img/user/' . $user->photo));
        $user->delete();

        Session::flash('success', __('User deleted successfully!'));
        return back();
    }

    public function bulkDelete(Request $request)
    {

        $ids = $request->ids;

        foreach ($ids as $id) {
            $user = User::findOrFail($id);

            $causes = $user->causes()->get();
            $causeCategories = $user->causeCategories()->get();
            $causesContent = $user->causesContent()->get();
            $donationDetails = $user->donationDetails()->get();

            DB::table('user_donation_settings')
                ->where('user_id', $user->id)
                ->delete();
            if (count($causes) > 0) {
                foreach ($causes as $cause) {
                    @unlink(public_path(Constant::WEBSITE_CAUSE_IMAGE . '/' . $cause->image));
                    $cause->delete();
                }
            }
            if (count($causeCategories) > 0) {
                foreach ($causeCategories as $cate) {
                    @unlink(public_path(Constant::WEBSITE_CAUSE_CATEGORY_IMAGE . '/' . $cate->image));
                    $cate->delete();
                }
            }
            if (count($donationDetails) > 0) {
                foreach ($donationDetails as $donation_detail) {
                    if (!is_null($donation_detail->receipt)) {
                        $directory = public_path(Constant::WEBSITE_DONATION_ATTACHMENT . '/' . $donation_detail->receipt);
                        if (file_exists($directory)) {
                            @unlink($directory);
                        }
                    }
                    if (!is_null($donation_detail->invoice)) {
                        $directory = public_path(Constant::WEBSITE_DONATION_INVOICE . '/' . $donation_detail->invoice);
                        if (file_exists($directory)) {
                            @unlink($directory);
                        }
                    }

                    $donation_detail->delete();
                }
            }

            if (count($causesContent) > 0) {
                foreach ($causesContent as $cont) {
                    $cont->delete();
                }
            }
            //start  course management informnation delete
            $courses = $user->courses;
            $instructors = $user->courseInstructtors()->get();

            if (count($courses) > 0) {
                foreach ($courses as $course) {
                    // enrollment delete
                    $totalEnrolment = $course->enrolment;

                    foreach ($totalEnrolment as $enrolment) {
                        if (!empty($enrolment->invoice)) {
                            Uploader::remove(Constant::WEBSITE_ENROLLMENT_INVOICE, $enrolment->invoice);
                        }
                        if (!empty($enrolment->attachment)) {
                            Uploader::remove(Constant::WEBSITE_ENROLLMENT_ATTACHMENT, $enrolment->invoice);
                        }
                        $enrolment->delete();
                    }

                    // get all the course information's of this course
                    $courseInformations = $course
                        ->courseInformation()
                        ->where('user_id', $user->id)
                        ->get();

                    foreach ($courseInformations as $courseInformation) {
                        // get all the modules of each course-information
                        $modules = $courseInformation->module()->get();

                        foreach ($modules as $module) {
                            // get all the lessons of each module
                            $lessons = $module->lesson()->get();

                            foreach ($lessons as $lesson) {
                                // get all the lesson contents of each lesson
                                $lessonContents = $lesson->content()->get();

                                foreach ($lessonContents as $lessonContent) {
                                    // delete lesson content item by checking the 'type'
                                    if ($lessonContent->type == 'video') {
                                        Uploader::remove(Constant::WEBSITE_LESSON_CONTENT_VIDEO, $lessonContent->video_unique_name);
                                    } elseif ($lessonContent->type == 'file') {
                                        Uploader::remove(Constant::WEBSITE_LESSON_CONTENT_FILE, $lessonContent->file_unique_name);
                                    } elseif ($lessonContent->type == 'quiz') {
                                        // get all the lesson quizzes of this lesson-content
                                        $lessonQuizzes = $lessonContent->quiz()->get();
                                        foreach ($lessonQuizzes as $lessonQuiz) {
                                            $lessonQuiz->delete();
                                        }
                                    }
                                    $lessonContent->delete();
                                }
                                $lesson->delete();
                            }
                            $module->delete();
                        }

                        $courseInformation->delete();
                    }
                    Uploader::remove(Constant::WEBSITE_COURSE_THUMBNAIL_IMAGE, $course->thumbnail_image);
                    Uploader::remove(Constant::WEBSITE_COURSE_COVER_IMAGE, $course->cover_image);

                    // get all the faqs of this course
                    $courseFaqs = $course->faq()->get();
                    foreach ($courseFaqs as $courseFaq) {
                        $courseFaq->delete();
                    }

                    // get all the reviews of this course
                    $reviews = $course->review()->get();
                    foreach ($reviews as $review) {
                        $review->delete();
                    }
                    // get all the quiz-scores of this course
                    $quizScores = $course->quizScore()->get();
                    foreach ($quizScores as $quizScore) {
                        $quizScore->delete();
                    }
                    // finally, delete the course
                    $course->delete();
                }
            }
            if ($user->courseCategory()->count() > 0) {
                $user->courseCategory()->delete();
            }
            if ($user->courseCoupon()->count() > 0) {
                $user->courseCoupon()->delete();
            }

            if ($user->lessonComplete()->count() > 0) {
                $user->lessonComplete()->delete();
            }
            if ($user->lessonContentComplete()->count() > 0) {
                $user->lessonContentComplete()->delete();
            }

            if (count($instructors) > 0) {
                foreach ($instructors as $key => $ins) {
                    @unlink(public_path(Constant::WEBSITE_INSTRUCTOR_IMAGE . '/' . $ins->image));
                    $ins->socialPlatform()->delete();
                    $ins->delete();
                }
            }
            //end course management informnation delete

            // hotel management content delete
            $rooms = $user->rooms()->get();
            $roomBookings = $user->roomBookings()->get();
            $roomContents = $user->roomContents();
            $roomCategories = $user->roomCategories();
            $roomCoupns = $user->roomCoupns();
            $roomAmenities = $user->roomAmenities();
            $roomReviews = $user->rommReviews();

            if ($rooms->count() > 0) {
                DB::table('user_room_settings')
                    ->where('user_id', $user->id)
                    ->delete();
                foreach ($rooms as $room) {
                    if (!is_null($room->slider_imgs)) {
                        $images = json_decode($room->slider_imgs);

                        foreach ($images as $image) {
                            if (file_exists('assets/img/rooms/slider_images/' . $image)) {
                                @unlink('assets/img/rooms/slider_images/' . $image);
                            }
                        }
                    }

                    if (!is_null($room->featured_img) && file_exists('assets/img/rooms/' . $room->featured_img)) {
                        @unlink('assets/img/rooms/' . $room->featured_img);
                    }
                    $room->delete();
                }
            }
            if ($roomBookings->count() > 0) {
                foreach ($roomBookings as $roomBooking) {
                    @unlink(public_path('assets/img/attachments/rooms/') . $roomBooking->attachment);
                    @unlink(public_path('assets/invoices/rooms/') . $roomBooking->invoice);
                    $roomBooking->delete();
                }
            }

            if ($roomContents->count() > 0) {
                $roomContents->delete();
            }
            if ($roomCategories->count() > 0) {
                $roomCategories->delete();
            }
            if ($roomCoupns->count() > 0) {
                $roomCoupns->delete();
            }
            if ($roomAmenities->count() > 0) {
                $roomAmenities->delete();
            }
            if ($roomReviews->count() > 0) {
                $roomReviews->delete();
            }

            if ($user->testimonials()->count() > 0) {
                $testimonials = $user->testimonials()->get();
                foreach ($testimonials as $key => $tstm) {
                    @unlink(public_path('assets/front/img/user/testimonials/' . $tstm->image));
                    $tstm->delete();
                }
            }

            if ($user->social_media()->count() > 0) {
                $user->social_media()->delete();
            }

            if ($user->skills()->count() > 0) {
                $user->skills()->delete();
            }

            if ($user->services()->count() > 0) {
                $services = $user->services()->get();
                foreach ($services as $key => $service) {
                    @unlink(public_path('assets/front/img/user/services/' . $service->image));
                    $service->delete();
                }
            }

            if ($user->subscribers()->count() > 0) {
                $user->subscribers()->delete();
            }

            if ($user->seos()->count() > 0) {
                $user->seos()->delete();
            }

            if ($user->portfolios()->count() > 0) {
                $portfolios = $user->portfolios()->get();
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

            if ($user->portfolioCategories()->count() > 0) {
                $user->portfolioCategories()->delete();
            }

            if ($user->permission()->count() > 0) {
                $user->permission()->delete();
            }

            if ($user->languages()->count() > 0) {
                $user->languages()->delete();
            }

            if ($user->home_page_texts()->count() > 0) {
                $homeTexts = $user->home_page_texts()->get();
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

            if ($user->home_section()->count() > 0) {
                $user->home_section()->delete();
            }

            if ($user->jobs()->count() > 0) {
                $user->jobs()->delete();
            }

            if ($user->jcategories()->count() > 0) {
                $user->jcategories()->delete();
            }

            if ($user->teams()->count() > 0) {
                $teams = $user->teams()->get();
                foreach ($teams as $key => $team) {
                    @unlink(public_path('/assets/front/img/user/team/' . $team->image));
                    $team->delete();
                }
            }

            if ($user->permissions()->count() > 0) {
                $user->permissions()->delete();
            }

            if ($user->qr_codes()->count() > 0) {
                $qr_codes = $user->qr_codes()->get();
                foreach ($qr_codes as $key => $qr) {
                    @unlink(public_path('assets/front/img/user/qr/' . $qr->image));
                    $qr->delete();
                }
            }

            if ($user->quotes()->count() > 0) {
                $user->quotes()->delete();
            }

            if ($user->quote_inputs()->count() > 0) {
                $quote_inputs = $user->quote_inputs()->get();
                foreach ($quote_inputs as $key => $input) {
                    if ($input->quote_input_options()->count() > 0) {
                        $input->quote_input_options()->delete();
                    }
                    $input->delete();
                }
            }

            if ($user->services()->count() > 0) {
                $services = $user->services()->get();
                foreach ($services as $key => $service) {
                    @unlink(public_path('assets/front/img/user/service/' . $service->image));
                    $service->delete();
                }
            }

            if ($user->vcards()->count() > 0) {
                $vcards = $user->vcards()->get();
                foreach ($vcards as $key => $vcard) {
                    @unlink(public_path('assets/front/img/user/vcard/' . $vcard->profile_image));
                    @unlink(public_path('assets/front/img/user/vcard/' . $vcard->cover_image));
                    if ($vcard->user_vcard_projects()->count() > 0) {
                        foreach ($vcard->user_vcard_projects as $key => $project) {
                            @unlink(public_path('assets/front/img/user/projects/' . $project->image));
                            $project->delete();
                        }
                    }
                    if ($vcard->user_vcard_services()->count() > 0) {
                        foreach ($vcard->user_vcard_services as $key => $service) {
                            @unlink(public_path('assets/front/img/user/services/' . $service->image));
                            $service->delete();
                        }
                    }
                    if ($vcard->user_vcard_testimonials()->count() > 0) {
                        foreach ($vcard->user_vcard_testimonials as $key => $testimonial) {
                            @unlink(public_path('assets/front/img/user/testimonials/' . $testimonial->image));
                            $testimonial->delete();
                        }
                    }
                    $vcard->delete();
                }
            }

            if ($user->processes()->count() > 0) {
                $user->processes()->delete();
            }

            if ($user->blog_categories()->count() > 0) {
                $user->blog_categories()->delete();
            }

            if ($user->blogs()->count() > 0) {
                $blogs = $user->blogs()->get();
                foreach ($blogs as $key => $blog) {
                    @unlink(public_path('assets/front/img/user/blogs/' . $blog->image));
                    $blog->delete();
                }
            }

            if ($user->basic_setting()->count() > 0) {
                $bs = $user->basic_setting;
                @unlink(public_path('assets/front/img/user/' . $bs->breadcrumb));
                @unlink(public_path('assets/front/img/user/' . $bs->logo));
                @unlink(public_path('assets/front/img/user/' . $bs->preloader));
                @unlink(public_path('assets/front/img/user/' . $bs->favicon));
                @unlink(public_path('assets/front/img/user/qr/' . $bs->qr_image));
                @unlink(public_path('assets/front/img/user/qr/' . $bs->qr_inserted_image));
                $bs->delete();
            }

            if ($user->memberships()->count() > 0) {
                foreach ($user->memberships as $key => $membership) {
                    @unlink(public_path('assets/front/img/membership/receipt/' . $membership->receipt));
                    $membership->delete();
                }
            }

            if ($user->brands()->count() > 0) {
                $brands = $user->brands()->get();
                foreach ($brands as $key => $brand) {
                    @unlink(public_path('assets/front/img/user/brands/' . $brand->brand_img));
                    $brand->delete();
                }
            }

            if ($user->user_contact()->count() > 0) {
                $contact = $user->user_contact;
                @unlink(public_path('assets/front/img/user/' . $contact->contact_form_image));
                $contact->delete();
            }

            if ($user->faqs()->count() > 0) {
                $user->faqs()->delete();
            }

            if ($user->footer_quick_links()->count() > 0) {
                $user->footer_quick_links()->delete();
            }

            if ($user->footer_texts()->count() > 0) {
                $user->footer_texts()->delete();
            }

            if ($user->menus()->count() > 0) {
                $user->menus()->delete();
            }

            if ($user->pages()->count() > 0) {
                $user->pages()->delete();
            }

            if ($user->hero_sliders()->count() > 0) {
                $sliders = $user->hero_sliders()->get();
                foreach ($sliders as $key => $slider) {
                    @unlink(public_path('assets/front/img/hero_slider/' . $slider->img));
                    $slider->delete();
                }
            }

            if ($user->hero_static()->count() > 0) {
                $static = $user->hero_static;
                @unlink(public_path('assets/front/img/hero_static/' . $static->img));
                $static->delete();
            }

            if ($user->customers()->count() > 0) {
                $customers = $user->customers()->get();
                foreach ($customers as $key => $customer) {
                    @unlink(public_path('assets/admin/img/propics/' . $customer->image));
                    $customer->delete();
                }
            }
            if ($user->user_features()->count() > 0) {
                $user_features = $user->user_features()->get();
                foreach ($user_features as $key => $feat) {
                    @unlink(public_path('assets/front/img/user/feature/' . $feat->icon));
                    $feat->delete();
                }
            }
            if ($user->user_items()->count() > 0) {
                $user_items = $user->user_items()->get();
                foreach ($user_items as $key => $item) {
                    @unlink(public_path('assets/front/img/user/items/thumbnail/' . $item->thumbnail));
                    foreach ($item->sliders as $key => $image) {
                        @unlink(public_path('assets/front/img/user/items/slider-images/' . $image->image));
                        $image->delete();
                    }
                    $item->itemContents()->delete();
                    $item->delete();
                }
            }
            if ($user->user_item_categories()->count() > 0) {
                $user_item_categories = $user->user_item_categories()->get();
                foreach ($user_item_categories as $key => $category) {
                    @unlink(public_path('assets/front/img/user/items/categories/' . $category->image));
                    $category->subcategories()->delete();
                }
            }
            if ($user->user_offer_banners()->count() > 0) {
                $user_offer_banners = $user->user_offer_banners()->get();
                foreach ($user_offer_banners as $key => $banner) {
                    @unlink(public_path('assets/front/img/user/offers/' . $banner->image));
                }
            }
            if ($user->user_coupons()->count() > 0) {
                $user->user_coupons()->delete();
            }
            if ($user->user_item_subcategories()->count() > 0) {
                $user->user_item_subcategories()->delete();
            }
            if ($user->user_offline_gateways()->count() > 0) {
                $user->user_offline_gateways()->delete();
            }
            if ($user->user_orders()->count() > 0) {
                $user->user_orders()->delete();
            }
            if ($user->user_payment_gateways()->count() > 0) {
                $user->user_payment_gateways()->delete();
            }
            if ($user->user_shipping_charges()->count() > 0) {
                $user->user_shipping_charges()->delete();
            }
            if ($user->user_shop_settings) {
                $user->user_shop_settings->delete();
            }

            @unlink(public_path('assets/front/img/user/' . $user->photo));
            $user->delete();
        }


        Session::flash('success', __('Users deleted successfully!'));
        return 'success';
    }


    public function removeCurrPackage(Request $request)
    {
        $userId = $request->user_id;
        $user = User::findOrFail($userId);
        $currMembership = UserPermissionHelper::currMembOrPending($userId);
        $currPackage = Package::select('title')->findOrFail($currMembership->package_id);
        $nextMembership = UserPermissionHelper::nextMembership($userId);
        $be = BasicExtended::first();
        $bs = BasicSetting::select('website_title')->first();

        $today = Carbon::now();

        // just expire the current package
        $currMembership->expire_date = $today->subDay();
        $currMembership->modified = 1;
        if ($currMembership->status == 0) {
            $currMembership->status = 2;
        }
        $currMembership->save();

        // if next package exists
        if (!empty($nextMembership)) {
            $nextPackage = Package::find($nextMembership->package_id);

            $nextMembership->start_date = Carbon::parse(Carbon::today()->format('d-m-Y'));
            if ($nextPackage->term == 'monthly') {
                $nextMembership->expire_date = Carbon::parse(Carbon::today()->addMonth()->format('d-m-Y'));
            } elseif ($nextPackage->term == 'yearly') {
                $nextMembership->expire_date = Carbon::parse(Carbon::today()->addYear()->format('d-m-Y'));
            } elseif ($nextPackage->term == 'lifetime') {
                $nextMembership->expire_date = Carbon::parse(Carbon::maxValue()->format('d-m-Y'));
            }
            $nextMembership->save();
        }

        $this->sendMail(null, null, $request->payment_method, $user, $bs, $be, 'admin_removed_current_package', null, $currPackage->title);

        Session::flash('success', __('Current Package removed successfully!'));
        return back();
    }

    public function sendMail($memb, $package, $paymentMethod, $user, $bs, $be, $mailType, $replacedPackage = null, $removedPackage = null)
    {
        if ($mailType != 'admin_removed_current_package' && $mailType != 'admin_removed_next_package') {
            $transaction_id = UserPermissionHelper::uniqidReal(8);
            $activation = $memb->start_date;
            $expire = $memb->expire_date;
            $info['start_date'] = $activation->toFormattedDateString();
            $info['expire_date'] = $expire->toFormattedDateString();
            $info['payment_method'] = $paymentMethod;
            $lastMemb = $user->memberships()->orderBy('id', 'DESC')->first();
            $file_name = $this->makeInvoice($info, 'membership', $user, null, $package->price, 'Stripe', $user->phone, $be->base_currency_symbol_position, $be->base_currency_symbol, $be->base_currency_text, $transaction_id, $package->title, $lastMemb);
        }

        $mailer = new MegaMailer();
        $data = [
            'toMail' => $user->email,
            'toName' => $user->fname,
            'username' => $user->username,
            'website_title' => $bs->website_title,
            'templateType' => $mailType,
        ];

        if ($mailType != 'admin_removed_current_package' && $mailType != 'admin_removed_next_package') {
            $data['package_title'] = $package->title;
            $data['package_price'] = ($be->base_currency_text_position == 'left' ? $be->base_currency_text . ' ' : '') . $package->price . ($be->base_currency_text_position == 'right' ? ' ' . $be->base_currency_text : '');
            $data['activation_date'] = $activation->toFormattedDateString();
            $data['expire_date'] = Carbon::parse($expire->toFormattedDateString())->format('Y') == '9999' ? 'Lifetime' : $expire->toFormattedDateString();
            $data['membership_invoice'] = $file_name;
        }
        if ($mailType != 'admin_removed_current_package' || $mailType != 'admin_removed_next_package') {
            $data['removed_package_title'] = $removedPackage;
        }

        if (!empty($replacedPackage)) {
            $data['replaced_package'] = $replacedPackage;
        }

        $mailer->mailFromAdmin($data);
    }

    public function changeCurrPackage(Request $request)
    {
        $userId = $request->user_id;
        $user = User::findOrFail($userId);
        $currMembership = UserPermissionHelper::currMembOrPending($userId);
        $nextMembership = UserPermissionHelper::nextMembership($userId);

        $be = BasicExtended::first();
        $bs = BasicSetting::select('website_title')->first();

        $selectedPackage = Package::find($request->package_id);

        // if the user has a next package to activate & selected package is 'lifetime' package
        if (!empty($nextMembership) && $selectedPackage->term == 'lifetime') {
            Session::flash('membership_warning', __('To add a Lifetime package as Current Package, You have to remove the next package'));
            return back();
        }

        // expire the current package
        $currMembership->expire_date = Carbon::parse(Carbon::now()->subDay()->format('d-m-Y'));
        $currMembership->modified = 1;
        if ($currMembership->status == 0) {
            $currMembership->status = 2;
        }
        $currMembership->save();

        // calculate expire date for selected package
        if ($selectedPackage->term == 'monthly') {
            $exDate = Carbon::now()->addMonth()->format('d-m-Y');
        } elseif ($selectedPackage->term == 'yearly') {
            $exDate = Carbon::now()->addYear()->format('d-m-Y');
        } elseif ($selectedPackage->term == 'lifetime') {
            $exDate = Carbon::maxValue()->format('d-m-Y');
        }
        // store a new membership for selected package
        $selectedMemb = Membership::create([
            'price' => $selectedPackage->price,
            'currency' => $be->base_currency_text,
            'currency_symbol' => $be->base_currency_symbol,
            'payment_method' => $request->payment_method,
            'transaction_id' => uniqid(),
            'status' => 1,
            'receipt' => null,
            'transaction_details' => null,
            'settings' => json_encode($be),
            'package_id' => $selectedPackage->id,
            'user_id' => $userId,
            'start_date' => Carbon::parse(Carbon::now()->format('d-m-Y')),
            'expire_date' => Carbon::parse($exDate),
            'is_trial' => 0,
            'trial_days' => 0,
        ]);

        // if the user has a next package to activate & selected package is not 'lifetime' package
        if (!empty($nextMembership) && $selectedPackage->term != 'lifetime') {
            $nextPackage = Package::find($nextMembership->package_id);

            // calculate & store next membership's start_date
            $nextMembership->start_date = Carbon::parse(Carbon::parse($exDate)->addDay()->format('d-m-Y'));

            // calculate & store expire date for next membership
            if ($nextPackage->term == 'monthly') {
                $exDate = Carbon::parse(
                    Carbon::parse(Carbon::parse($exDate)->addDay()->format('d-m-Y'))
                        ->addMonth()
                        ->format('d-m-Y'),
                );
            } elseif ($nextPackage->term == 'yearly') {
                $exDate = Carbon::parse(
                    Carbon::parse(Carbon::parse($exDate)->addDay()->format('d-m-Y'))
                        ->addYear()
                        ->format('d-m-Y'),
                );
            } else {
                $exDate = Carbon::parse(Carbon::maxValue()->format('d-m-Y'));
            }
            $nextMembership->expire_date = $exDate;
            $nextMembership->save();
        }

        $currentPackage = Package::select('title')->findOrFail($currMembership->package_id);
        $this->sendMail($selectedMemb, $selectedPackage, $request->payment_method, $user, $bs, $be, 'admin_changed_current_package', $currentPackage->title);

        Session::flash('success', __('Current Package changed successfully!'));
        return back();
    }

    public function addCurrPackage(Request $request)
    {
        $userId = $request->user_id;
        $user = User::findOrFail($userId);
        $be = BasicExtended::first();
        $bs = BasicSetting::select('website_title')->first();

        $selectedPackage = Package::find($request->package_id);

        // calculate expire date for selected package
        if ($selectedPackage->term == 'monthly') {
            $exDate = Carbon::now()->addMonth()->format('d-m-Y');
        } elseif ($selectedPackage->term == 'yearly') {
            $exDate = Carbon::now()->addYear()->format('d-m-Y');
        } elseif ($selectedPackage->term == 'lifetime') {
            $exDate = Carbon::maxValue()->format('d-m-Y');
        }
        // store a new membership for selected package
        $selectedMemb = Membership::create([
            'price' => $selectedPackage->price,
            'currency' => $be->base_currency_text,
            'currency_symbol' => $be->base_currency_symbol,
            'payment_method' => $request->payment_method,
            'transaction_id' => uniqid(),
            'status' => 1,
            'receipt' => null,
            'transaction_details' => null,
            'settings' => json_encode($be),
            'package_id' => $selectedPackage->id,
            'user_id' => $userId,
            'start_date' => Carbon::parse(Carbon::now()->format('d-m-Y')),
            'expire_date' => Carbon::parse($exDate),
            'is_trial' => 0,
            'trial_days' => 0,
        ]);

        $this->sendMail($selectedMemb, $selectedPackage, $request->payment_method, $user, $bs, $be, 'admin_added_current_package');

        Session::flash('success', __('Current Package has been added successfully!'));
        return back();
    }

    public function removeNextPackage(Request $request)
    {
        $userId = $request->user_id;
        $user = User::findOrFail($userId);
        $be = BasicExtended::first();
        $bs = BasicSetting::select('website_title')->first();
        $nextMembership = UserPermissionHelper::nextMembership($userId);
        // set the start_date to unlimited
        $nextMembership->start_date = Carbon::parse(Carbon::maxValue()->format('d-m-Y'));
        $nextMembership->modified = 1;
        $nextMembership->save();

        $nextPackage = Package::select('title')->findOrFail($nextMembership->package_id);

        $this->sendMail(null, null, $request->payment_method, $user, $bs, $be, 'admin_removed_next_package', null, $nextPackage->title);

        Session::flash('success', __('Next Package removed successfully!'));
        return back();
    }

    public function changeNextPackage(Request $request)
    {
        $userId = $request->user_id;
        $user = User::findOrFail($userId);
        $bs = BasicSetting::select('website_title')->first();
        $be = BasicExtended::first();
        $nextMembership = UserPermissionHelper::nextMembership($userId);
        $nextPackage = Package::find($nextMembership->package_id);
        $selectedPackage = Package::find($request->package_id);

        $prevStartDate = $nextMembership->start_date;
        // set the start_date to unlimited
        $nextMembership->start_date = Carbon::parse(Carbon::maxValue()->format('d-m-Y'));
        $nextMembership->modified = 1;
        $nextMembership->save();

        // calculate expire date for selected package
        if ($selectedPackage->term == 'monthly') {
            $exDate = Carbon::parse($prevStartDate)->addMonth()->format('d-m-Y');
        } elseif ($selectedPackage->term == 'yearly') {
            $exDate = Carbon::parse($prevStartDate)->addYear()->format('d-m-Y');
        } elseif ($selectedPackage->term == 'lifetime') {
            $exDate = Carbon::parse(Carbon::maxValue()->format('d-m-Y'));
        }

        // store a new membership for selected package
        $selectedMemb = Membership::create([
            'price' => $selectedPackage->price,
            'currency' => $be->base_currency_text,
            'currency_symbol' => $be->base_currency_symbol,
            'payment_method' => $request->payment_method,
            'transaction_id' => uniqid(),
            'status' => 1,
            'receipt' => null,
            'transaction_details' => null,
            'settings' => json_encode($be),
            'package_id' => $selectedPackage->id,
            'user_id' => $userId,
            'start_date' => Carbon::parse($prevStartDate),
            'expire_date' => Carbon::parse($exDate),
            'is_trial' => 0,
            'trial_days' => 0,
        ]);

        $this->sendMail($selectedMemb, $selectedPackage, $request->payment_method, $user, $bs, $be, 'admin_changed_next_package', $nextPackage->title);

        Session::flash('success', __('Next Package changed successfully!'));
        return back();
    }

    public function addNextPackage(Request $request)
    {
        $userId = $request->user_id;

        $hasPendingMemb = UserPermissionHelper::hasPendingMembership($userId);
        if ($hasPendingMemb) {
            Session::flash('membership_warning', __('This user already has a Pending Package. Please take an action (change / remove / approve / reject) for that package first.'));
            return back();
        }

        $currMembership = UserPermissionHelper::userPackage($userId);
        $currPackage = Package::find($currMembership->package_id);
        $be = BasicExtended::first();
        $user = User::findOrFail($userId);
        $bs = BasicSetting::select('website_title')->first();

        $selectedPackage = Package::find($request->package_id);

        if ($currMembership->is_trial == 1) {
            Session::flash('membership_warning', __('If your current package is trial package, then you have to change / remove the current package first.'));
            return back();
        }

        // if current package is not lifetime package
        if ($currPackage->term != 'lifetime') {
            // calculate expire date for selected package
            if ($selectedPackage->term == 'monthly') {
                $exDate = Carbon::parse($currMembership->expire_date)
                    ->addDay()
                    ->addMonth()
                    ->format('d-m-Y');
            } elseif ($selectedPackage->term == 'yearly') {
                $exDate = Carbon::parse($currMembership->expire_date)
                    ->addDay()
                    ->addYear()
                    ->format('d-m-Y');
            } elseif ($selectedPackage->term == 'lifetime') {
                $exDate = Carbon::parse(Carbon::maxValue()->format('d-m-Y'));
            }
            // store a new membership for selected package
            $selectedMemb = Membership::create([
                'price' => $selectedPackage->price,
                'currency' => $be->base_currency_text,
                'currency_symbol' => $be->base_currency_symbol,
                'payment_method' => $request->payment_method,
                'transaction_id' => uniqid(),
                'status' => 1,
                'receipt' => null,
                'transaction_details' => null,
                'settings' => json_encode($be),
                'package_id' => $selectedPackage->id,
                'user_id' => $userId,
                'start_date' => Carbon::parse(
                    Carbon::parse($currMembership->expire_date)
                        ->addDay()
                        ->format('d-m-Y'),
                ),
                'expire_date' => Carbon::parse($exDate),
                'is_trial' => 0,
                'trial_days' => 0,
            ]);

            $this->sendMail($selectedMemb, $selectedPackage, $request->payment_method, $user, $bs, $be, 'admin_added_next_package');
        } else {
            Session::flash('membership_warning', __('If your current package is lifetime package, then you have to change / remove the current package first.'));
            return back();
        }

        Session::flash('success', __('Next Package has been added successfully!'));
        return back();
    }

    public function userTemplate(Request $request)
    {
        if ($request->template == 1) {
            $prevImg = $request->file('preview_image');
            $allowedExts = ['jpg', 'png', 'jpeg'];

            $rules = [
                'serial_number' => 'required|integer',
                'template_name' => 'required',
                'show_home' => 'required|integer',
                'preview_image' => [
                    'required',
                    function ($attribute, $value, $fail) use ($prevImg, $allowedExts) {
                        if (!empty($prevImg)) {
                            $ext = $prevImg->getClientOriginalExtension();
                            if (!in_array($ext, $allowedExts)) {
                                return $fail('Only png, jpg, jpeg image is allowed');
                            }
                        }
                    },
                ],
            ];
            $messages = [
                'show_home.required' => 'Show in home is required',
            ];

            $request->validate($rules, $messages);
        }
        $user = User::where('id', $request->user_id)->first();

        if ($request->template == 1) {
            if ($request->hasFile('preview_image')) {
                @unlink(public_path('assets/front/img/template-previews/' . $user->template_img));
                $filename = uniqid() . '.' . $prevImg->getClientOriginalExtension();
                $dir = public_path('assets/front/img/template-previews/');
                @mkdir($dir, 0775, true);
                $request->file('preview_image')->move($dir, $filename);
                $user->template_img = $filename;
            }
            $user->template_serial_number = $request->serial_number;
        } else {
            @unlink(public_path('assets/front/img/template-previews/' . $user->template_img));
            $user->template_img = null;
            $user->template_serial_number = 0;
        }
        $user->preview_template = $request->template;
        $user->template_name = $request->template_name;
        $user->show_home = $request->show_home;
        $user->save();
        Session::flash('success', __('Status updated successfully!'));
        return back();
    }
    public function userUpdateTemplate(Request $request)
    {
        $prevImg = $request->file('preview_image');
        $allowedExts = ['jpg', 'png', 'jpeg'];
        $rules = [
            'serial_number' => 'required|integer',
            'template_name' => 'required',
            'show_home' => 'required|integer',
            'preview_image' => [
                function ($attribute, $value, $fail) use ($prevImg, $allowedExts) {
                    if (!empty($prevImg)) {
                        $ext = $prevImg->getClientOriginalExtension();
                        if (!in_array($ext, $allowedExts)) {
                            return $fail('Only png, jpg, jpeg image is allowed');
                        }
                    }
                },
            ],
        ];
        $messages = [
            'show_home.required' => 'Show in home is required',
        ];
        $validator = Validator::make($request->all(), $rules, $messages);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }
        $user = User::where('id', $request->user_id)->first();
        if ($request->hasFile('preview_image')) {
            @unlink(public_path('assets/front/img/template-previews/' . $user->template_img));
            $filename = uniqid() . '.' . $prevImg->getClientOriginalExtension();
            $dir = public_path('assets/front/img/template-previews/');
            @mkdir($dir, 0775, true);
            $request->file('preview_image')->move($dir, $filename);
            $user->template_img = $filename;
        }
        $user->template_serial_number = $request->serial_number;
        $user->template_name = $request->template_name;
        $user->show_home = $request->show_home;
        $user->save();
        Session::flash('success', __('Status updated successfully!'));
        return 'success';
    }
}
