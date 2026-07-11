<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Helpers\Uploader;
use App\Models\User\Language;
use App\Models\User\Member;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Validator;

class MemberController extends Controller
{
    public function createMember(Request $request)
    {
        // first, get the language info from db
        $information['language'] = Language::where('code', $request->language)->where('user_id', Auth::user()->id)->first();
        $data['userLanguages'] = Language::where('user_id', Auth::id())->get();

        return view('user.team_section.create', $information);
    }

    public function storeMember(Request $request)
    {

        $rules = [
            'user_language_id' => 'required',
            'name' => 'required',
            'rank' => 'required',
        ];
        if (!$request->hasFile('image')) {
            $rules['image'] = 'required|mimes:jpeg,jpg,png,svg|max:1000';
        }
        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator);
        }

        if ($request->hasFile('image')) {
            $request['image_name'] = Uploader::upload_picture('assets/front/img/user/team', $request->file('image'));
        }
        Member::create($request->except('language_id', 'image', 'user_id') + [
            'language_id' => $request->user_language_id,
            'image' => $request->image_name,
            'user_id' => Auth::id()
        ]);
        $request->session()->flash('success', __('New member added successfully') . '!');
        return redirect()->back();
    }

    public function editMember(Request $request, $id)
    {
        // first, get the language info from db
        $information['language'] = Language::where('code', $request->language)->where('user_id', Auth::user()->id)->first();
        $information['memberInfo'] = Member::where('user_id', Auth::user()->id)->where('id', $id)->firstOrFail();
        return view('user.team_section.edit', $information);
    }

    public function updateMember(Request $request, $id)
    {
        $rules = [
            'name' => 'required',
            'rank' => 'required',
        ];
        if ($request->hasFile('image')) {
            $rules['image'] = 'required|mimes:jpeg,jpg,png,svg|max:1000';
        }
        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator);
        }
        $member = Member::where('user_id', Auth::user()->id)->where('id', $id)->firstOrFail();
        $request['image_name'] = $member->image;
        if ($request->hasFile('image')) {
            $request['image_name'] = Uploader::update_picture('assets/front/img/user/team', $request->file('image'), $member->image);
        }
        $member->update($request->except('image') + [
            'image' => $request->image_name
        ]);
        $request->session()->flash('success', __('Member updated successfully') . '!');
        return redirect()->back();
    }

    public function deleteMember(Request $request): \Illuminate\Http\RedirectResponse
    {
        $member = Member::where('user_id', Auth::user()->id)->where('id', $request->member_id)->firstOrFail();
        @unlink(public_path('assets/front/img/user/team/') . $member->image);
        $member->delete();
        $request->session()->flash('success', __('Member deleted successfully') . '!');
        return redirect()->back();
    }
    public function featured(Request $request): \Illuminate\Http\RedirectResponse
    {
        $member = Member::where('user_id', Auth::user()->id)->where('id', $request->member_id)->firstOrFail();
        $member->featured = $request->featured;
        $member->save();
        if ($request->featured == 1) {
            Session::flash('success', __('Featured successfully') . '!');
        } else {
            Session::flash('success', __('Unfeatured successfully') . '!');
        }
        return back();
    }
}
