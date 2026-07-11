<?php

namespace App\Http\Controllers\User;

use Validator;
use Illuminate\Http\Request;
use App\Models\EmailTemplate;
use App\Http\Controllers\Controller;
use App\Http\Helpers\UserPermissionHelper;
use Illuminate\Support\Facades\Auth;
use App\Models\User\UserEmailTemplate;

class MailTemplateController extends Controller
{
    public function mailTemplates()
    {
        $packagePermissions = json_decode(UserPermissionHelper::packagePermission(Auth::guard('web')->user()->id), true);

        $courseEmailTemplate = ['course_enrolment', 'course_enrolment_approved', 'course_enrolment_rejected'];
        $hotelEmailTemplate = ['room_booking'];
        $donationEmailTemplate = ['donation', 'donation_approved'];
        $ecommerceEmailTemplate = ['product_order'];
        
        $templates = UserEmailTemplate::where('user_id', Auth::guard('web')->user()->id)
            ->when($courseEmailTemplate, function ($query) use ($packagePermissions, $courseEmailTemplate) {
                if (!in_array('Course Management', $packagePermissions)) {
                    $query->whereNotIn('email_type', $courseEmailTemplate);
                }
            })
            ->when($hotelEmailTemplate, function ($query) use ($packagePermissions, $hotelEmailTemplate) {
                if (!in_array('Hotel Booking', $packagePermissions)) {
                    $query->whereNotIn('email_type', $hotelEmailTemplate);
                }
            })
            ->when($donationEmailTemplate, function ($query) use ($packagePermissions, $donationEmailTemplate) {
                if (!in_array('Donation Management', $packagePermissions)) {
                    $query->whereNotIn('email_type', $donationEmailTemplate);
                }
            })
            ->when($ecommerceEmailTemplate, function ($query) use ($packagePermissions, $ecommerceEmailTemplate) {
                if (!in_array('Ecommerce', $packagePermissions)) {
                    $query->whereNotIn('email_type', $ecommerceEmailTemplate);
                }
            })
            ->get();
        $data['templates'] = $templates;
        return view('user.settings.email.templates', $data);
    }

    public function editMailTemplate($id)
    {
        $templateInfo = UserEmailTemplate::findOrFail($id);
        return view('user.settings.email.edit-template', compact('templateInfo'));
    }

    public function updateMailTemplate(Request $request, $id)
    {
        $rules = [
            'email_subject' => 'required',
            'email_body' => 'required'
        ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator->errors());
        }

        UserEmailTemplate::findOrFail($id)->update([
            'email_body' => clean($request->email_body),
            'email_subject' => $request->email_subject,
        ]);

        $request->session()->flash('success', __('Mail template updated successfully'). '!');

        return redirect()->back();
    }
}
