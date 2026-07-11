<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\User\VcardController;
use App\Models\User\UserVcard;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Validator;

class UsersVcardsController extends Controller
{
    public function index(Request $request)
    {
        $term = $request->term;

        $vcards = UserVcard::when($term, function ($query, $term) {
            $query->where('vcard_name', 'like', '%' . $term . '%')->orWhere('email', 'like', '%' . $term . '%');
        })->latest()->paginate(10);

        return view('admin.register_user.vcard.vcards', compact('vcards'));
    }

    public function vcardTemplate(Request $request)
    {
        if ($request->template == 1) {
            $prevImg = $request->file('preview_image');
            $allowedExts = array('jpg', 'png', 'jpeg');

            $rules = [
                'serial_number' => 'required|integer',
                "template_name" => 'required',
                'show_in_home' => 'required|integer',
                'preview_image' => [
                    'required',
                    function ($attribute, $value, $fail) use ($prevImg, $allowedExts) {
                        if (!empty($prevImg)) {
                            $ext = $prevImg->getClientOriginalExtension();
                            if (!in_array($ext, $allowedExts)) {
                                return $fail( __('Only png, jpg, jpeg image is allowed') . ".");
                            }
                        }
                    },
                ]
            ];


            $request->validate($rules);
        }

        $vcard = UserVcard::where('id', $request->vcard_id)->first();

        if ($request->template == 1) {
            if ($request->hasFile('preview_image')) {
                @unlink(public_path('assets/front/img/template-previews/vcard/' . $vcard->template_img));
                $filename = uniqid() . '.' . $prevImg->getClientOriginalExtension();
                $dir = public_path('assets/front/img/template-previews/vcard/');
                @mkdir($dir, 0775, true);
                $request->file('preview_image')->move($dir, $filename);
                $vcard->template_img = $filename;
            }
            $vcard->template_serial_number = $request->serial_number;
        } else {
            @unlink(public_path('assets/front/img/template-previews/vcard/' . $vcard->template_img));
            $vcard->template_img = NULL;
            $vcard->template_serial_number = 0;
        }
        $vcard->preview_template = $request->template;
        $vcard->template_name = $request->template_name;
        $vcard->show_in_home = $request->show_in_home;
        $vcard->save();
        Session::flash('success', __('Status updated successfully') . '!');
        return back();
    }

    public function vcardUpdateTemplate(Request $request)
    {
        // dd($request->all());
        $prevImg = $request->file('preview_image');
        $allowedExts = array('jpg', 'png', 'jpeg');
        $rules = [
            'serial_number' => 'required|integer',
            "template_name" => 'required',
            'show_in_home' => 'required|integer',
            'preview_image' => [
                function ($attribute, $value, $fail) use ($prevImg, $allowedExts) {
                    if (!empty($prevImg)) {
                        $ext = $prevImg->getClientOriginalExtension();
                        if (!in_array($ext, $allowedExts)) {
                            return $fail(__('Only png, jpg, jpeg image is allowed') . ".");
                        }
                    }
                },
            ]
        ];
        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }
        $vcard = UserVcard::where('id', $request->vcard_id)->first();
        if ($request->hasFile('preview_image')) {
            @unlink(public_path('assets/front/img/template-previews/vcard/' . $vcard->template_img));
            $filename = uniqid() . '.' . $prevImg->getClientOriginalExtension();
            $dir = public_path('assets/front/img/template-previews/vcard/');
            @mkdir($dir, 0775, true);
            $request->file('preview_image')->move($dir, $filename);
            $vcard->template_img = $filename;
        }
        $vcard->template_name = $request->template_name;
        $vcard->show_in_home = $request->show_in_home;
        $vcard->template_serial_number = $request->serial_number;
        $vcard->save();
        Session::flash('success', __('Status updated successfully') . '!');
        return "success";
    }

    public function changeStatus(Request $request)
    {
        $request->validate([
            'status' => 'required|integer'
        ]);
        $vcard = UserVcard::find($request->vcard_id);
        $vcard->status = $request->status;
        $vcard->save();
        Session::flash('success', __('Status updated successfully') . '!');
        return back();
    }

    public function destroy(Request $request)
    {
        $vcard = new VcardController();
        $vcard->deleteVcard($request->vcard_id);
        Session::flash('success', __('Vcard Deleted Successfully') . '!');
        return back();
    }
}
