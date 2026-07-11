<?php

namespace App\Http\Controllers\Front\CourseManagement;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class FreeCourseEnrolController extends Controller
{
    public function enrolmentProcess($courseId, $userId)
    {
        $enrol = new EnrolmentController();

        $arrData = array('courseId' => $courseId, 'paymentStatus' => 'free');

        // store the course enrolment information in database
        $enrolmentInfo = $enrol->storeData($arrData, $userId);

        // generate an invoice in pdf format
        $invoice = $enrol->generateInvoice($enrolmentInfo, $courseId, $userId);

        // then, update the invoice field info in database
        $enrolmentInfo->update(['invoice' => $invoice]);

        // send a mail to the customer with the invoice
        $enrol->sendMail($enrolmentInfo, $userId);

        return redirect()->route('front.user.course_enrolment.complete', [getParam(), 'id' => $courseId]);
    }
}
