<?php

namespace App\Http\Controllers\User;

use Illuminate\Http\Request;
use App\Models\User\Language;
use App\Models\User\UserItemCategory;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Validator;

class ItemCategoryController extends Controller
{
    public function index(Request $request)
    {
        $lang = Language::where('code', $request->language)->where('user_id', Auth::guard('web')->user()->id)->first();
        $lang_id = $lang->id;
        $data['itemcategories'] = UserItemCategory::where('language_id', $lang_id)
            ->where('user_id', Auth::guard('web')->user()->id)
            ->orderBy('id', 'DESC')
            ->paginate(10);
        $data['lang_id'] = $lang_id;
        return view('user.item.category.index', $data);
    }


    public function store(Request $request)
    {

        $slug = rawurlencode(make_slug($request->name));
        $check_category = UserItemCategory::where('user_id', Auth::guard('web')->user()->id)->where('slug', $slug)
            ->where('language_id', $request->user_language_id)->first();
        if (!empty($check_category)) {
            Session::flash('warning', __('The Category has already Taken') . '!');
            return "success";
        }

        $rules = [
            'user_language_id' => 'required',
            'name' => 'required|max:255',
            'status' => 'required',
        ];
        if ($request->hasFile('image')) {
            $rules['image'] = 'mimes:jpeg,png,svg,jpg';
        }
        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }
        $data = new UserItemCategory;
        $input = $request->all();
        $input['slug'] =  $slug;
        $input['user_id'] =  Auth::guard('web')->user()->id;
        $input['language_id'] =  $request->user_language_id;

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $name = time() . $file->getClientOriginalName();
            $file->move(public_path('assets/front/img/user/items/categories/'), $name);
            $input['image'] = $name;
        }
        $data->create($input);

        Session::flash('success', __('Category added successfully') . '!');
        return "success";
    }

    public function edit($id)
    {
        $data = UserItemCategory::findOrFail($id);
        return view('user.item.category.edit', compact('data'));
    }

    public function update(Request $request)
    {

        $rules = [
            'name' => 'required|max:255',
            'status' => 'required',
        ];

        if ($request->hasFile('image')) {
            $rules['image'] = 'mimes:jpeg,png,svg,jpg';
        }

        $slug = rawurlencode(make_slug($request->name));
        $check_category = UserItemCategory::where('user_id', Auth::guard('web')->user()->id)->where('slug', $slug)
            ->where('language_id', $request->user_language_id)->first();
        if (!empty($check_category)) {
            if ($check_category->id != $request->category_id) {
                Session::flash('warning', __('The Category has already Taken') . '!');
                return "success";
            }
        }
        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }

        $data = UserItemCategory::findOrFail($request->category_id);
        $input = $request->all();
        $input['slug'] =  $slug;

        if ($request->hasFile('image')) {
            @unlink(public_path('assets/front/img/user/items/categories/' . $data->image));
            $file = $request->file('image');
            $name = time() . $file->getClientOriginalName();
            $file->move(public_path('assets/front/img/user/items/categories/'), $name);
            $input['image'] = $name;
        } else {
            $input['image'] =  $data->image;
        }
        $data->update($input);

        Session::flash('success', __('Category Update successfully') . '!');
        return "success";
    }


    public function feature(Request $request)
    {
        $category = UserItemCategory::findOrFail($request->category_id);
        $category->is_feature = $request->is_feature;
        $category->save();

        if ($request->is_feature == 1) {
            Session::flash('success', __('Category featured successfully') . '!');
        } else {
            Session::flash('success', __('Category unfeatured successfully') . '!');
        }
        return back();
    }
    public function footer(Request $request)
    {
        $category = UserItemCategory::findOrFail($request->category_id);
        $category->is_footer = $request->is_footer;
        $category->save();

        if ($request->is_footer == 1) {
            Session::flash('success', __('Footer Status Updated Successfully') . '!');
        } else {
            Session::flash('success', __('Footer Status Updated Successfully') . '!');
        }
        return back();
    }

    public function delete(Request $request)
    {
        $category = UserItemCategory::findOrFail($request->category_id);
        if ($category->items()->count() > 0) {
            Session::flash('warning', __('First, delete all the item under the selected categories') . '!');
            return back();
        }
        @unlink(public_path('assets/front/img/user/items/categories/' . $category->image));
        $category->delete();
        $category->subcategories()->delete();
        Session::flash('success', __('Category deleted successfully') . '!');
        return back();
    }

    public function bulkDelete(Request $request)
    {
        $ids = $request->ids;
        foreach ($ids as $id) {
            $pcategory = UserItemCategory::findOrFail($id);
            if ($pcategory->items()->count() > 0) {
                Session::flash('warning', __('First, delete all the item under the selected categories') . '!');
                return "success";
            }
        }
        foreach ($ids as $id) {
            $ItemCategory = UserItemCategory::findOrFail($id);
            @unlink(public_path('assets/front/img/user/items/categories/' . $ItemCategory->image));
            $ItemCategory->delete();
            $ItemCategory->subcategories()->delete();
        }
        Session::flash('success', __('Item categories deleted successfully') . '!');
        return "success";
    }
}
