<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User\Page;
use App\Models\User\Language;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Validator;
use Mews\Purifier\Facades\Purifier;

class PageController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::guard('web')->user();
        
        $lang = Language::where('code', $request->language)
        ->where('user_id', $user->id)
        ->firstOrFail();

        $lang_id = $lang->id;
        $data['apages'] = Page::where('language_id', $lang_id)
        ->where('user_id', $user->id)
        ->orderBy('id', 'DESC')
        ->get();

        $data['lang_id'] = $lang_id;
        $data['lang'] = $lang;
        return view('user.page.index', $data);
    }

    public function create()
    {
        return view('user.page.create');
    }

    public function store(Request $request)
    {
        $slug = make_slug($request->title);
        $userId = Auth::user()->id;
        $langId = $request->user_language_id;

        $rules = [
            'user_language_id' => 'required',
            'name' => 'required',
            'title' => [
                'required',
                function ($attribute, $value, $fail) use ($userId, $langId, $slug) {
                    $pages = Page::where('language_id', $langId)->where('user_id', $userId)->get();
                    foreach ($pages as $key => $page) {
                        if ($page->slug == $slug) {
                            return $fail(__('The title field must be unique') . ".");
                        }
                    }
                },
            ],
            'body' => 'required',
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }

        $page = new Page;
        $page->user_id = $userId;
        $page->language_id = $langId;
        $page->name = $request->name;
        $page->title = $request->title;
        $page->slug = $slug;
        $page->body = Purifier::clean($request->body);
        $page->meta_keywords = $request->meta_keywords;
        $page->meta_description = $request->meta_description;
        $page->save();

        Session::flash('success', __('Page created successfully') . '!');
        return "success";
    }

    public function edit($pageID)
    {
        $data['page'] = Page::where('user_id', Auth::user()->id)->where('id', $pageID)->firstOrFail();
        return view('user.page.edit', $data);
    }

    public function update(Request $request)
    {
        $slug = make_slug($request->title);
        $pageID = $request->pageid;
        $page = Page::where('user_id', Auth::user()->id)->where('id', $pageID)->firstOrFail();

        $userId = Auth::user()->id;
        $langId = $page->language_id;

        $rules = [
            'name' => 'required',
            'title' => [
                'required',
                function ($attribute, $value, $fail) use ($userId, $langId, $slug, $pageID) {
                    $pages = Page::where('language_id', $langId)->where('user_id', $userId)->where('id', '<>', $pageID)->get();
                    foreach ($pages as $key => $page) {
                        if ($page->slug == $slug) {
                            return $fail(__('The title field must be unique') . ".");
                        }
                    }
                },
            ],
            'body' => 'required',
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }


        $page->name = $request->name;
        $page->title = $request->title;
        $page->slug = $slug;
        $page->body = Purifier::clean($request->body);
        $page->meta_keywords = $request->meta_keywords;
        $page->meta_description = $request->meta_description;
        $page->save();

        Session::flash('success', __('Page updated successfully') . '!');
        return "success";
    }

    public function delete(Request $request)
    {
        $pageID = $request->pageid;
        $page = Page::where('user_id', Auth::user()->id)->where('id', $pageID)->firstOrFail();
        $page->delete();
        Session::flash('success', __('Page deleted successfully') . '!');
        return redirect()->back();
    }

    public function bulkDelete(Request $request)
    {
        $ids = $request->ids;

        foreach ($ids as $id) {
            $page = Page::where('user_id', Auth::user()->id)->where('id', $id)->firstOrFail();
            $page->delete();
        }

        Session::flash('success', __('Pages deleted successfully') . '!');
        return "success";
    }

}
