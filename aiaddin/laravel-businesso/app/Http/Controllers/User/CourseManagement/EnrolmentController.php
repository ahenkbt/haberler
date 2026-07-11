<?php

namespace App\Http\Controllers\User\CourseManagement;

use App\Constants\Constant;
use App\Http\Controllers\Controller;
use App\Http\Helpers\Uploader;
use App\Models\User\BasicSetting;
use App\Models\User\CourseManagement\Course;
use App\Models\User\CourseManagement\CourseEnrolment;
use App\Models\User\CourseManagement\CourseInformation;
use App\Models\User\Language;
use App\Models\User\UserEmailTemplate;
use App\Models\User\UserOfflineGateway;
use App\Models\User\UserPaymentGeteway;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Session;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\EnrolmentsExport;
use PDF;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

class EnrolmentController extends Controller
{
    public function index(Request $request)
    {
        $defaultLang = Language::query()->where('user_id', Auth::guard('web')->user()->id)->where('dashboard_default', 1)->first();
        $orderId = $paymentStatus = null;

        if ($request->filled('order_id')) {
            $orderId = $request['order_id'];
        }

        if ($request->filled('status')) {
            $paymentStatus = $request['status'];
        }

        $courseIds = [];
        if ($request->filled('course')) {
            $courseIds = CourseInformation::where('title', 'like', '%' . $request->course . '%')->where('language_id', $defaultLang->id)->pluck('course_id')->toArray();
        }

        $enrolments = CourseEnrolment::where('user_id', Auth::guard('web')->user()->id)
            ->when($orderId, function ($query, $orderId) {
                return $query->where('order_id', 'like', '%' . $orderId . '%');
            })->when($paymentStatus, function ($query, $paymentStatus) {
                return $query->where('payment_status', '=', $paymentStatus);
            });

        $enrolments = $enrolments->where(function ($query) use ($courseIds, $request) {
            if (!empty($courseIds)) {
                foreach ($courseIds as $key => $courseId) {
                    if ($key == 0) {
                        $query->where('course_id', $courseId);
                    } else {
                        $query->orWhere('course_id', $courseId);
                    }
                }
            } elseif (!empty($request->course) && empty($courseIds)) {
                $query->where('course_id', []);
            }
        });

        $enrolments = $enrolments->orderByDesc('id')->paginate(10);

        return view('user.course_management.enrolment.index', compact('enrolments', 'defaultLang'));
    }

    public function updatePaymentStatus(Request $request, $id)
    {
        $enrolment = CourseEnrolment::where('user_id', Auth::guard('web')->user()->id)->find($id);

        if ($request['payment_status'] == 'completed') {
            $enrolment->update([
                'payment_status' => 'completed'
            ]);

            $invoice = $this->generateInvoice($enrolment);

            $enrolment->update([
                'invoice' => $invoice
            ]);

            $this->sendMail($request, $enrolment, 'enrolment approved');
        } else if ($request['payment_status'] == 'pending') {
            $enrolment->update([
                'payment_status' => 'pending'
            ]);
        } else {
            $enrolment->update([
                'payment_status' => 'rejected'
            ]);

            $this->sendMail($request, $enrolment, 'enrolment rejected');
        }

        return redirect()->back();
    }

    public function generateInvoice($enrolmentInfo)
    {
        $userId = Auth::guard('web')->user()->id;
        // delete previous invoice
        Uploader::remove(Constant::WEBSITE_ENROLLMENT_INVOICE, $enrolmentInfo->invoice);
        // generate new invoice
        $fileName = $enrolmentInfo->order_id . '.pdf';
        $directory = public_path(Constant::WEBSITE_ENROLLMENT_INVOICE);

        if (!file_exists($directory)) {
            mkdir($directory, 0775, true);
        }

        $fileLocated = $directory.'/' . $fileName;

        $path = public_path(Constant::WEBSITE_ENROLLMENT_INVOICE . '/' . $fileName);

        // get course title
        $language =  $this->getUserCurrentLanguage(Auth::guard('web')->user()->id);

        $course = $enrolmentInfo->course()->first();
        $courseInfo = $course->courseInformation()->where('language_id', $language->id)->where('user_id', Auth::guard('web')->user()->id)->first();
        $userBs = BasicSetting::select('email', 'from_name', 'website_title', 'logo', 'favicon')->where('user_id', $userId)->first();
        $width = '50%';
        $float = 'left';

        PDF::loadView('pdf.enrollment', compact('enrolmentInfo', 'courseInfo', 'userBs', 'width', 'float'))->save($fileLocated);

        return $fileName;
    }

    public function sendMail($request, $enrolmentInfo, $mailFor)
    {

        $user = Auth::guard('web')->user();
        $userId = $user->id;
        // first get the mail template info from db
        if ($mailFor == 'enrolment approved') {
            $mailTemplate = UserEmailTemplate::where('email_type', 'course_enrolment_approved')->where('user_id', $userId)->first();
        } else {
            $mailTemplate = UserEmailTemplate::where('email_type', 'course_enrolment_rejected')->where('user_id', $userId)->first();
        } 
        $mailSubject = $mailTemplate->email_subject;
        $mailBody = $mailTemplate->email_body;

        // second get the website title & mail's smtp info from db
        $be = DB::table('basic_extendeds')
            ->select('is_smtp', 'smtp_host',  'smtp_username', 'smtp_password', 'from_mail', 'from_name')
            ->first();

        $userBs = BasicSetting::select('email', 'from_name', 'website_title')->where('user_id', $userId)->first();

        $customerName = $enrolmentInfo->billing_first_name . ' ' . $enrolmentInfo->billing_last_name;
        $orderId = $enrolmentInfo->order_id;

        $language = Language::where('dashboard_default', 1)->where('user_id', $userId)->first();
        $course = Course::where('id', $enrolmentInfo->course_id)->where('user_id', $userId)->firstOrFail();
        $courseInfo = $course->courseInformation()->where('language_id', $language->id)->where('user_id', $userId)->firstOrFail();
        $courseTitle = $courseInfo->title;

        $websiteTitle = $userBs->website_title;

        $mailBody = str_replace('{customer_name}', $customerName, $mailBody);
        $mailBody = str_replace('{order_id}', $orderId, $mailBody);
        $mailBody = str_replace('{title}', '<a href="' . route('front.user.course.details', [$user->username, $courseInfo->slug]) . '">' . $courseTitle . '</a>', $mailBody);
        $mailBody = str_replace('{website_title}', $websiteTitle, $mailBody);

        // initialize a new mail
        $mail = new PHPMailer(true);
        $mail->CharSet = 'UTF-8';
        $mail->Encoding = 'base64';
        
        // if smtp status == 1, then set some value for PHPMailer
        if ($be->is_smtp == 1) {
            $mail->isSMTP();
            $mail->Host       = $be->smtp_host;
            $mail->SMTPAuth   = true;
            $mail->Username   = $be->smtp_username;
            $mail->Password   = $be->smtp_password;

            // if ($be->encryption == 'TLS') {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            // }

            $mail->Port       = 587;
        }

        // finally add other informations and send the mail
        try {
            // Recipients
            $mail->setFrom($be->from_mail, $userBs->from_name);
            $mail->addReplyTo($userBs->email, $userBs->from_name);
            $mail->addAddress($enrolmentInfo->billing_email);

            // Attachments (Invoice)
            if (!is_null($enrolmentInfo->invoice) && $mailFor == 'enrolment approved') {
                $mail->addAttachment(public_path(Constant::WEBSITE_ENROLLMENT_INVOICE . '/' . $enrolmentInfo->invoice));
            }

            // Content
            $mail->isHTML(true);
            $mail->Subject = $mailSubject;
            $mail->Body = $mailBody;

            $mail->send();

            $request->session()->flash('success', __('Payment status updated & mail has been sent successfully') . '!');
        } catch (Exception $e) {
            $request->session()->flash('warning', __('Mail could not be sent') . '.');
        }

        return;
    }

    public function show($id)
    {
        $enrolmentInfo = CourseEnrolment::query()->where('user_id', Auth::guard('web')->user()->id)->find($id);
        // get course title
        $language = $this->getUserCurrentLanguage(Auth::guard('web')->user()->id);
        $course = $enrolmentInfo->course()->first();
        $courseInfo = $course->courseInformation()->where('language_id', $language->id)->where('user_id', Auth::guard('web')->user()->id)->first();
        $courseTitle = $courseInfo->title;

        return view('user.course_management.enrolment.details', compact('enrolmentInfo', 'courseTitle'));
    }

    public function destroy($id)
    {
        $enrolmentInfo = CourseEnrolment::query()->where('user_id', Auth::guard('web')->user()->id)->find($id);
        // first, delete the attachment
        Uploader::remove(Constant::WEBSITE_ENROLLMENT_ATTACHMENT, $enrolmentInfo->attachment);
        // second, delete the invoice
        Uploader::remove(Constant::WEBSITE_ENROLLMENT_INVOICE, $enrolmentInfo->invoice);
        $enrolmentInfo->delete();
        return redirect()->back()->with('success', __('Enrolment deleted successfully') . '!');
    }

    public function bulkDestroy(Request $request)
    {
        $ids = $request->ids;
        foreach ($ids as $id) {
            $enrolmentInfo = CourseEnrolment::query()->where('user_id', Auth::guard('web')->user()->id)->find($id);
            // first, delete the attachment
            Uploader::remove(Constant::WEBSITE_ENROLLMENT_ATTACHMENT, $enrolmentInfo->attachment);
            // second, delete the invoice
            Uploader::remove(Constant::WEBSITE_ENROLLMENT_INVOICE, $enrolmentInfo->invoice);
            $enrolmentInfo->delete();
        }
        session()->flash('success', __('Enrolments deleted successfully') . '!');
        return "success";
    }

    public function report(Request $request)
    {
        $fromDate = $request->from_date;
        $toDate = $request->to_date;
        $paymentStatus = $request->payment_status;
        $paymentMethod = $request->payment_method;
        $deLang = Language::where('dashboard_default', 1)->where('user_id', Auth::guard('web')->user()->id)->first();

        if (!empty($fromDate) && !empty($toDate)) {
            $enrolments = CourseEnrolment::when($fromDate, function ($query, $fromDate) {
                return $query->whereDate('created_at', '>=', Carbon::parse($fromDate));
            })->when($toDate, function ($query, $toDate) {
                return $query->whereDate('created_at', '<=', Carbon::parse($toDate));
            })->when($paymentMethod, function ($query, $paymentMethod) {
                return $query->where('payment_method', $paymentMethod);
            })->when($paymentStatus, function ($query, $paymentStatus) {
                return $query->where('payment_status', '=', $paymentStatus);
            })
                ->where('user_id', Auth::guard('web')->user()->id)
                ->orderByDesc('id');

            Session::put('enrollment_report', $enrolments->get());
            $data['enrolments'] = $enrolments->paginate(10);
        } else {
            Session::put('enrollment_report', []);
            $data['enrolments'] = [];
        }

        $data['onPms'] = UserPaymentGeteway::where('status', 1)->where('user_id', Auth::guard('web')->user()->id)->get();
        $data['offPms'] = UserOfflineGateway::where('item_checkout_status', 1)->where('user_id', Auth::guard('web')->user()->id)->get();
        $data['deLang'] = $deLang;
        $data['abs'] = BasicSetting::select('base_currency_symbol_position', 'base_currency_symbol')->first();


        return view('user.course_management.enrolment.report', $data);
    }

    public function export()
    {
        $enrolments = Session::get('enrollment_report');
        if (empty($enrolments) || count($enrolments) == 0) {
            Session::flash('warning', __('There is no enrolment to export') . '.');
            return back();
        }
        return Excel::download(new EnrolmentsExport($enrolments), 'enrolments.csv');
    }
}
