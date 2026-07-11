<?php

namespace App\Http\Controllers\Admin;

use App\Models\BasicExtended;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\BasicSetting;
use App\Models\Language;
use Session;
use Validator;

class ContactController extends Controller
{
    public function index(Request $request)
    {
        if (empty($request->language)) {
            $data['lang_id'] = 0;
            $data['abs'] = BasicSetting::firstOrFail();
            $data['abe'] = BasicExtended::firstOrFail();
        } else {
            $lang = Language::where('code', $request->language)->firstOrFail();
            $data['lang_id'] = $lang->id;
            $data['abs'] = $lang->basic_setting;
            $data['abe'] = $lang->basic_extended;
        }
        return view('admin.contact', $data);
    }

    public function update(Request $request, $langid)
    {
        $request->validate([
            'contact_addresses' => 'required',
            'contact_numbers' => 'required',
            'contact_mails' => 'required'
        ]);


        $be = BasicExtended::where('language_id', $langid)->firstOrFail();
        
      
        $be->contact_addresses = $request->contact_addresses;
        $be->contact_numbers = $request->contact_numbers;
        $be->contact_mails = $request->contact_mails;
     
        $be->save();

        Session::flash('success', __('Contact page updated successfully!'));
        return back();
    }
}
