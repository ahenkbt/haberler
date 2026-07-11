<?php

namespace App\Http\Controllers\User;

use Illuminate\Http\Request;
use App\Models\User\Language;
use App\Http\Controllers\Controller;
use App\Models\User\UserItemCategory;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use App\Models\User\UserItemSubCategory;
use Illuminate\Support\Facades\Validator;

class ItemSubCategoryController extends Controller
{
    public function index(Request $request)
    {
        $lang = Language::where('code', $request->language)->where('user_id', Auth::guard('web')->user()->id)->first();
        $lang_id = $lang->id;
        $data['categories'] = UserItemCategory::where('language_id', $lang_id)->where('status', 1)->where('user_id', Auth::guard('web')->user()->id)->orderBy('name', 'ASC')->get();
        $data['itemsubcategories'] = UserItemSubCategory::where('language_id', $lang_id)->where('user_id', Auth::guard('web')->user()->id)
            ->with('category')
            ->orderBy('id', 'DESC')->paginate(10);
        $data['lang_id'] = $lang_id;
        return view('user.item.subcategory.index', $data);
    }
    public function store(Request $request)
    {
        $rules = [
            'user_language_id' => 'required',
            'name' => 'required|max:255',
            'category_id' => 'required',
            'status' => 'required',
        ];

        $slug = rawurlencode(make_slug($request->name));
        $check_category = UserItemSubCategory::where('user_id', Auth::guard('web')->user()->id)->where('slug', $slug)
            ->where('language_id', $request->user_language_id)->first();
        if (!empty($check_category)) {
            Session::flash('warning', __('The Subcategory has already Taken') . '!');
            return "success";
        }

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }
        $data = new UserItemSubCategory;
        $input = $request->all();
        $input['slug'] =  make_slug($request->name);
        $input['user_id'] =  Auth::guard('web')->user()->id;
        $input['language_id'] =  $request->user_language_id;
        $data->create($input);
        Session::flash('success', __('Subcategory added successfully') . '!');
        return "success";
    }

    public function edit($id)
    {
        $data['data'] = UserItemSubCategory::findOrFail($id);
        $lang = Language::where('code', request('language'))->where('user_id', Auth::guard('web')->user()->id)->first();
        $lang_id = $lang->id;
        $data['categories'] = UserItemCategory::where('language_id', $lang_id)->where('status', 1)->where('user_id', Auth::guard('web')->user()->id)->orderBy('name', 'ASC')->get();
        return view('user.item.subcategory.edit', $data);
    }
    public function update(Request $request)
    {
        $rules = [
            'name' => 'required|max:255',
            'status' => 'required',
            'category_id' => 'required',
        ];

        $slug = rawurlencode(make_slug($request->name));
        $check_category = UserItemSubCategory::where('user_id', Auth::guard('web')->user()->id)->where('slug', $slug)
            ->where('language_id', $request->user_language_id)->first();
        if (!empty($check_category)) {
            if ($check_category->id != $request->subcategory_id) {
                Session::flash('warning', __('The Subcategory has already Taken') . '!');
                return "success";
            }
        }

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }
        $data = UserItemSubCategory::findOrFail($request->subcategory_id);
        $input = $request->all();
        $input['slug'] =  make_slug($request->name);
        $data->update($input);
        Session::flash('success', __('Subcategory Update successfully') . '!');
        return "success";
    }
    public function delete(Request $request)
    {
        $category = UserItemSubCategory::findOrFail($request->subcategory_id);
        if ($category->items()->count() > 0) {
            Session::flash('warning', __('First, delete all the item under the selected subcategory') . '!');
            return back();
        }
        $category->delete();
        Session::flash('success', __('Subcategory deleted successfully') . '!');
        return back();
    }
    public function bulkDelete(Request $request)
    {
        $ids = $request->ids;
        foreach ($ids as $id) {
            $pcategory = UserItemSubCategory::findOrFail($id);
            if ($pcategory->items()->count() > 0) {
                Session::flash('warning', __('First, delete all the item under the selected subcategories') . '!');
                return "success";
            }
        }
        foreach ($ids as $id) {
            $ItemCategory = UserItemSubCategory::findOrFail($id);
            $ItemCategory->delete();
        }
        Session::flash('success', __('Item subcategories deleted successfully') . '!');
        return "success";
    }


    public function getCategories($id)
    {
        if (!is_null($id)) {
            $categories = UserItemCategory::where('language_id', $id)
                ->where('user_id', Auth::guard('web')->user()->id)
                ->where('status', 1)
                ->orderBy('name', 'asc')
                ->get();
            return response()->json(['successData' => $categories]);
        } else {
            return response()->json(['errorData' => __('Sorry, an error has occurred') . '!'], 400);
        }
    }
}
