<?php

namespace App\Http\Controllers\Front\CourseManagement;

use App\Constants\Constant;
use App\Http\Controllers\Controller;
use App\Http\Controllers\User\CourseManagement\Payment\AuthorizenetController;
use App\Http\Controllers\User\CourseManagement\Payment\FlutterwaveController;
use App\Http\Controllers\User\CourseManagement\Payment\InstamojoController;
use App\Http\Controllers\User\CourseManagement\Payment\MercadoPagoController;
use App\Http\Controllers\User\CourseManagement\Payment\MollieController;
use App\Http\Controllers\User\CourseManagement\Payment\OfflineController;
use App\Http\Controllers\User\CourseManagement\Payment\PaypalController;
use App\Http\Controllers\User\CourseManagement\Payment\PaystackController;
use App\Http\Controllers\User\CourseManagement\Payment\PaytmController;
use App\Http\Controllers\User\CourseManagement\Payment\RazorpayController;
use App\Http\Controllers\User\CourseManagement\Payment\StripeController;
use App\Http\Helpers\UserPermissionHelper;
use App\Models\User\BasicSetting;
use App\Models\User\CourseManagement\Course;
use App\Models\User\CourseManagement\CourseEnrolment;
use App\Models\User\CourseManagement\CourseInformation;
use App\Models\User\UserEmailTemplate;
use App\Traits\MiscellaneousTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use PDF;
use PHPMailer\PHPMailer\PHPMailer;
use App\Http\Controllers\User\CourseManagement\Payment\PhonePeController;
use App\Http\Controllers\User\CourseManagement\Payment\PerfectMoneyController;
use App\Http\Controllers\User\CourseManagement\Payment\XenditController;
use App\Http\Controllers\User\CourseManagement\Payment\YocoController;
use App\Http\Controllers\User\CourseManagement\Payment\ToyyibpayController;
use App\Http\Controllers\User\CourseManagement\Payment\PaytabsController;
use App\Http\Controllers\User\CourseManagement\Payment\MidtransController;
use App\Http\Controllers\User\CourseManagement\Payment\IyzicoController;
use App\Http\Controllers\User\CourseManagement\Payment\MyFatoorahController;


class EnrolmentController extends Controller
{
    use MiscellaneousTrait;
    public function enrolment(Request $request, $domain, $id)
    {
         $keywords = getUserKeywords();
        $request->validate([
            'identity_number' => $request->gateway == 'iyzico' ? 'required' : '',
            'zip_code' => $request->gateway == 'iyzico' ? 'required' : '',
        ]);
        $user = getUser();
        // check whether user is logged in or not
        if (!Auth::guard('customer')->check()) {
            return redirect()->route('customer.login', [getParam(), 'redirectPath' => 'course_details']);
        } else {
            // check for user's profile information
            $customer = Auth::guard('customer')->user();
            if (
                is_null($customer->billing_fname) ||
                is_null($customer->billing_lname) ||
                is_null($customer->billing_email) ||
                is_null($customer->billing_number) ||
                is_null($customer->billing_city) ||
                is_null($customer->billing_state) ||
                is_null($customer->billing_address) ||
                is_null($customer->billing_country)
            ) {
                $message = $keywords['Please_complete_your_billing_information'] ?? 'Please complete your billing information';
                session()->flash('warning', $message);
                return redirect()->route('customer.billing-details', getParam());
            }
        }
        // free course enrolment
        if ($request->filled('type') && $request['type'] == 'free') {
            $freeCourseEnrol = new FreeCourseEnrolController();
            return $freeCourseEnrol->enrolmentProcess($id, $user->id);
        }
        // premium course enrolment
        $paymentMsg = $keywords['Please_select_a_payment_method'] ?? 'Please select a payment method';
        if (!session()->has('discountedPrice') && !$request->exists('gateway')) {
            session()->flash('error', $paymentMsg);
            return redirect()->back();
        } else if ((session()->has('discountedPrice') && session()->get('discountedPrice') > 0) && !$request->exists('gateway')) {
            session()->flash('error', $paymentMsg);
            return redirect()->back();
        } else if ($request['gateway'] == 'paypal') {
            $paypal = new PayPalController();
            return $paypal->enrolmentProcess($request, $id, $user->id);
        } else if ($request['gateway'] == 'instamojo') {
            $instamojo = new InstamojoController();
            return $instamojo->enrolmentProcess($request, $id, $user->id);
        } else if ($request['gateway'] == 'paystack') {
            $paystack = new PaystackController();
            return $paystack->enrolmentProcess($request, $id, $user->id);
        } else if ($request['gateway'] == 'flutterwave') {

            $flutterwave = new FlutterwaveController;
            return $flutterwave->enrolmentProcess($request, $id, $user->id);
        } else if ($request['gateway'] == 'razorpay') {
            $razorpay = new RazorpayController();
            return $razorpay->enrolmentProcess($request, $id, $user->id);
        } else if ($request['gateway'] == 'mercadopago') {
            $mercadopago = new MercadoPagoController();
            return $mercadopago->enrolmentProcess($request, $id, $user->id);
        } else if ($request['gateway'] == 'mollie') {
            $mollie = new MollieController();
            return $mollie->enrolmentProcess($request, $id, $user->id);
        } else if ($request['gateway'] == 'stripe') {
            $stripe = new StripeController();
            return $stripe->enrolmentProcess($request, $id, $user->id);
        } else if ($request['gateway'] == 'paytm') {
            $paytm = new PaytmController();
            return $paytm->enrolmentProcess($request, $id, $user->id);
        } else if ($request['gateway'] == 'authorize.net') {
            $authorizeNet = new AuthorizenetController();
            return $authorizeNet->enrolmentProcess($request, $id, $user->id);
        } else if ($request['gateway'] == 'phonepe') {
            $phonepe = new PhonePeController();
            return $phonepe->enrolmentProcess($request, $id, $user->id);
        } else if ($request['gateway'] == 'perfect_money') {
            $phonepe = new PerfectMoneyController();
            return $phonepe->enrolmentProcess($request, $id, $user->id);
        } else if ($request['gateway'] == 'xendit') {
            $phonepe = new XenditController();
            return $phonepe->enrolmentProcess($request, $id, $user->id);
        } else if ($request['gateway'] == 'yoco') {
            $phonepe = new YocoController();
            return $phonepe->enrolmentProcess($request, $id, $user->id);
        } else if ($request['gateway'] == 'toyyibpay') {
            $toyyibpay = new ToyyibpayController();
            return $toyyibpay->enrolmentProcess($request, $id, $user->id);
        } else if ($request['gateway'] == 'paytabs') {
            $paytabs = new PaytabsController();
            return $paytabs->enrolmentProcess($request, $id, $user->id);
        } else if ($request['gateway'] == 'midtrans') {
            $midtrans = new MidtransController();
            return $midtrans->enrolmentProcess($request, $id, $user->id);
        } else if ($request['gateway'] == 'iyzico') {
            $iyzico = new IyzicoController();
            return $iyzico->enrolmentProcess($request, $id, $user->id);
        } else if ($request['gateway'] == 'myfatoorah') {
            $myfatoorah = new MyFatoorahController();
            return $myfatoorah->enrolmentProcess($request, $id, $user->id);
        } else {
            $offline = new OfflineController();
            return $offline->enrolmentProcess($request, $id, $user->id);
        }
    }

    public function calculation(Request $request, $courseId, $userId)
    {
        $course = Course::query()
            ->where('id', '=', $courseId)
            ->where('user_id', $userId)
            ->where('status', '=', 'published')
            ->firstOrFail();

        $course_price = floatval($course->current_price);

        if ($request->session()->has('discountedCourse')) {
            $_course_id = $request->session()->get('discountedCourse');

            if ($courseId == $_course_id) {
                if ($request->session()->has('discount')) {
                    $_discount = $request->session()->get('discount');
                }

                if ($request->session()->has('discountedPrice')) {
                    $_course_new_price = $request->session()->get('discountedPrice');
                }
            }
        }

        return [
            'coursePrice' => $course_price,
            'discount' => isset($_discount) ? floatval($_discount) : null,
            'grandTotal' => isset($_course_new_price) ? floatval($_course_new_price) : $course_price
        ];
    }

    public function storeData($info, $userId)
    {
        $customer = Auth::guard('customer')->user();
        return CourseEnrolment::create([
            'user_id' => $userId,
            'customer_id' => Auth::guard('customer')->user()->id,
            'order_id' => time(),
            'billing_first_name' => $customer->billing_fname,
            'billing_last_name' => $customer->billing_lname,
            'billing_email' => $customer->billing_email,
            'billing_contact_number' => $customer->billing_number,
            'billing_address' => $customer->billing_address,
            'billing_city' => $customer->billing_city,
            'billing_state' =>  $customer->billing_state,
            'billing_country' =>  $customer->billing_country,
            'course_id' => $info['courseId'],
            'course_price' => array_key_exists('coursePrice', $info) ? $info['coursePrice'] : null,
            'discount' => array_key_exists('discount', $info) ? $info['discount'] : null,
            'grand_total' => array_key_exists('grandTotal', $info) ? $info['grandTotal'] : null,
            'currency_text' => array_key_exists('currencyText', $info) ? $info['currencyText'] : null,
            'currency_text_position' => array_key_exists('currencyTextPosition', $info) ? $info['currencyTextPosition'] : null,
            'currency_symbol' => array_key_exists('currencySymbol', $info) ? $info['currencySymbol'] : null,
            'currency_symbol_position' => array_key_exists('currencySymbolPosition', $info) ? $info['currencySymbolPosition'] : null,
            'payment_method' => array_key_exists('paymentMethod', $info) ? $info['paymentMethod'] : null,
            'gateway_type' => array_key_exists('gatewayType', $info) ? $info['gatewayType'] : null,
            'payment_status' => array_key_exists('paymentStatus', $info) ? $info['paymentStatus'] : null,
            'attachment' => array_key_exists('attachmentFile', $info) ? $info['attachmentFile'] : null,
            'conversation_id' => array_key_exists('conversation_id', $info) ? $info['conversation_id'] : null
        ]);
    }

    public function generateInvoice($enrolmentInfo, $courseId, $userId)
    {

        $fileName = $enrolmentInfo->order_id . '.pdf';
        $directory = public_path(Constant::WEBSITE_ENROLLMENT_INVOICE);

        if (!file_exists($directory)) {
            mkdir($directory, 0775, true);
        }

        $fileLocated = $directory . $fileName;

        // get course title
        $language = $this->getUserCurrentLanguage($userId);
        $course = Course::query()->where('user_id', $userId)->findOrFail($courseId);
        $courseInfo = CourseInformation::query()
            ->where('course_id', $course->id)
            ->where('user_id', $userId)
            ->where('language_id', $language->id)
            ->firstOrFail();
        $userBs = BasicSetting::query()->select('website_title', 'logo', 'favicon')->where('user_id', $userId)->first();

        $width = '50%';
        $float = 'left';

        PDF::loadView('pdf.enrollment', compact('enrolmentInfo', 'courseInfo', 'userBs', 'width', 'float'))->save($fileLocated);

        return $fileName;
    }

    public function sendMail($enrolmentInfo, $userId)
    {
        // first get the mail template info from db
        $mailTemplate = UserEmailTemplate::query()
            ->where('email_type', 'course_enrolment')
            ->where('user_id', $userId)
            ->first();
        $mailSubject = $mailTemplate->email_subject;
        $mailBody = $mailTemplate->email_body;

        // second get the website title & mail's smtp info from db
        $be = DB::table('basic_extendeds')
            ->select('is_smtp', 'smtp_host', 'smtp_username', 'smtp_password', 'from_mail', 'from_name')
            ->first();

        $userBs = BasicSetting::query()->where('user_id', $userId)
            ->select('website_title', 'email', 'from_name')
            ->first();

        $customerName = $enrolmentInfo->billing_first_name . ' ' . $enrolmentInfo->billing_last_name;
        $orderId = $enrolmentInfo->order_id;

        $language = $this->getUserCurrentLanguage($userId);
        $course = Course::query()
            ->where('id', $enrolmentInfo->course_id)
            ->firstOrFail();
        $courseInfo = CourseInformation::query()
            ->where('user_id', $userId)
            ->where('course_id', $course->id)
            ->where('language_id', $language->id)
            ->firstOrFail();
        $courseTitle = $courseInfo->title;

        $websiteTitle = $userBs->website_title;

        $mailBody = str_replace('{customer_name}', $customerName, $mailBody);
        $mailBody = str_replace('{order_id}', $orderId, $mailBody);
        $mailBody = str_replace('{title}', $courseTitle, $mailBody);
        $mailBody = str_replace('{website_title}', $websiteTitle, $mailBody);

        // initialize a new mail
        $mail = new PHPMailer(true);
        $mail->CharSet = 'UTF-8';
        $mail->Encoding = 'base64';

        // if smtp status == 1, then set some value for PHPMailer
        if ($be->is_smtp == 1) {
            $mail->isSMTP();
            $mail->Host = $be->smtp_host;
            $mail->SMTPAuth = true;
            $mail->Username = $be->smtp_username;
            $mail->Password = $be->smtp_password;
            // if ($be->encryption == 'TLS') {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            // }
            $mail->Port = 587;
        }

        // finally, add other informations and send the mail
        try {
            // Recipients
            $mail->setFrom($be->from_mail, $userBs->from_name);
            $mail->addReplyTo($userBs->email, $userBs->from_name);
            $mail->addAddress($enrolmentInfo->billing_email);
            $path = public_path(Constant::WEBSITE_ENROLLMENT_INVOICE . '/' . $enrolmentInfo->invoice);
            // Attachments (Invoice)

            $mail->addAttachment($path);
            // Content
            $mail->isHTML(true);
            $mail->Subject = $mailSubject;
            $mail->Body = $mailBody;
            $mail->send();
            return;
        } catch (\Exception $e) {
            return session()->flash('warning', 'Mail could not be sent! Mailer Error: ' . $e);
        }
    }

    public function complete(Request $request, $domain, $id, $via = null)
    {
        $user = getUser();
        $language = MiscellaneousTrait::getCustomerCurrentLanguage();
        // $queryResult['bgImg'] = $this->getUserBreadcrumb($user->id);
        $course = Course::query()->where('user_id', $user->id)->findOrFail($id);

        $queryResult['courseInfo'] = CourseInformation::query()
            ->where('course_id', $course->id)
            ->where('user_id', $user->id)
            ->where('language_id', $language->id)
            ->firstOrFail();

        $queryResult['paidVia'] = $via;

        // forget all session data before proceed
        $request->session()->forget('discountedCourse');
        $request->session()->forget('discount');
        $request->session()->forget('discountedPrice');

        return view('user-front.course_management.payment_success', $queryResult);
    }

    public function cancel(Request $request, $domain, $id)
    {
        $user = getUser();
        $language = $this->getUserCurrentLanguage($user->id);
        $course = Course::query()->where('user_id', $user->id)->findOrFail($id);

        $courseInfo = CourseInformation::query()
            ->where('course_id', $course->id)
            ->where('user_id', $user->id)
            ->where('language_id', $language->id)
            ->firstOrFail();

        session()->flash('error', 'Sorry, an error has occurred!');

        // forget all session data before proceed
        $request->session()->forget('discountedCourse');
        $request->session()->forget('discount');
        $request->session()->forget('discountedPrice');

        return redirect()->route('front.user.course.details', [getParam(), 'slug' => $courseInfo->slug]);
    }
}
