<?php

namespace App\Http\Controllers\Admin;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\BasicSetting as BS;
use App\Models\Language;
use Purifier;
use Validator;
use Session;

class IntrosectionController extends Controller
{
    public function index(Request $request)
    {
        $lang = Language::where('code', $request->language)->firstOrFail();
        $data['lang_id'] = $lang->id;
        $data['abs'] = $lang->basic_setting;
        return view('admin.home.intro-section', $data);
    }

    public function update(Request $request, $langid)
    {


        // $main_image = $request->file('intro_main_image');
        $signature = $request->file('intro_signature');
        $video_bg = $request->file('intro_video_image');

        $allowedExts = array('jpg', 'png', 'jpeg');

        $rules = [];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }

        $input = $request->all();

        $bs = BS::where('language_id', $langid)->firstOrFail();

        $input['intro_text'] = Purifier::clean($request->intro_text);
        $bs->update($input);

        Session::flash('success', __('data updated successfully!'));
        return "success";
    }

    public function removeImage(Request $request)
    {
        $type = $request->type;
        $langid = $request->language_id;

        $bs = BS::where('language_id', $langid)->firstOrFail();

        if ($type == "signature") {
            @unlink(public_path("assets/front/img/" . $bs->intro_signature));
            $bs->intro_signature = NULL;
            $bs->save();
        }

        $request->session()->flash('success', __('Image removed successfully!'));
        return "success";
    }
}
