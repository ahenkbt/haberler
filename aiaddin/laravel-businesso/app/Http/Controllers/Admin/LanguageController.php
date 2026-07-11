<?php

namespace App\Http\Controllers\Admin;

use Auth;
use App\Models\Menu;
use App\Models\User;
use App\Models\Language;
use App\Traits\Keywords;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Models\BasicSetting as BS;
use App\Models\BasicExtended as BE;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Input;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Validator;
use App\Models\User\Language as UserLanguage;

class LanguageController extends Controller
{
    public function index($lang = false)
    {
        $data['languages'] = Language::all();
        return view('admin.language.index', $data);
    }

    public function store(Request $request)
    {

        $rules = [
            'name' => 'required|max:255',
            'code' => ['required', 'max:255', 'unique:languages'],
            'direction' => 'required',
        ];

        $langCode = trim(strtolower($request->code));

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }

        // admin front loacalization file
        $data = file_get_contents(resource_path('lang/') . 'default.json');
    
        $json_file = $langCode . '.json';
        $path = resource_path('lang/') . $json_file;
        File::put($path, $data);

        // admin localization file
        $this->adminLanguageKeywords($langCode);
       
        // user localization file
        $this->userLanguageKeywords($langCode);

        $defaultLang = Language::where('is_default', 1)->first();
        $in['name'] = $request->name;
        $in['code'] = $langCode;
        $in['rtl'] = $request->direction;
        $in['customer_keywords'] = $defaultLang->customer_keywords;

        if (Language::where('is_default', 1)->count() > 0) {
            $in['is_default'] = 0;
        } else {
            $in['is_default'] = 1;
        }
        $lang = Language::create($in);

        // duplicate First row of basic_settings for current language
        $dbs = Language::where('is_default', 1)->first()->basic_setting;
        $cols = json_decode($dbs, true);
        $bs = new BS();
        
        foreach ($cols as $key => $value) {
            // if the column is 'id' [primary key] then skip it
            if ($key == 'id') {
                continue;
            }

            // create favicon image using default language image & save unique name in database
            if ($key == 'favicon') {
                // take default lang image
                $dimg = public_path('assets/front/img/' . $dbs->favicon);

                // copy paste the default language image with different unique name
                $filename = uniqid();
                if (($pos = strpos($dbs->favicon, '.')) !== false) {
                    $ext = substr($dbs->favicon, $pos + 1);
                }
                $newImgName = $filename . '.' . $ext;

                @copy($dimg, public_path('assets/front/img/' . $newImgName));

                // save the unique name in database
                $bs[$key] = $newImgName;

                // continue the loop
                continue;
            }

            // create logo image using default language image & save unique name in database
            if ($key == 'logo') {
                // take default lang image
                $dimg = public_path('assets/front/img/' . $dbs->logo);

                // copy paste the default language image with different unique name
                $filename = uniqid();
                if (($pos = strpos($dbs->logo, '.')) !== false) {
                    $ext = substr($dbs->logo, $pos + 1);
                }
                $newImgName = $filename . '.' . $ext;

                @copy($dimg, public_path('assets/front/img/' . $newImgName));

                // save the unique name in database
                $bs[$key] = $newImgName;

                // continue the loop
                continue;
            }

            // create logo image using default language image & save unique name in database
            if ($key == 'preloader') {
                // take default lang image
                $dimg = public_path('assets/front/img/' . $dbs->preloader);

                // copy paste the default language image with different unique name
                $filename = uniqid();
                if (($pos = strpos($dbs->preloader, '.')) !== false) {
                    $ext = substr($dbs->preloader, $pos + 1);
                }
                $newImgName = $filename . '.' . $ext;

                @copy($dimg, public_path('assets/front/img/' . $newImgName));

                // save the unique name in database
                $bs[$key] = $newImgName;

                // continue the loop
                continue;
            }

            // create logo image using default language image & save unique name in database
            if ($key == 'maintenance_img') {
                // take default lang image
                $dimg = public_path('assets/front/img/' . $dbs->maintenance_img);

                // copy paste the default language image with different unique name
                $filename = uniqid();
                if (($pos = strpos($dbs->maintenance_img, '.')) !== false) {
                    $ext = substr($dbs->maintenance_img, $pos + 1);
                }
                $newImgName = $filename . '.' . $ext;

                @copy($dimg, public_path('assets/front/img/' . $newImgName));

                // save the unique name in database
                $bs[$key] = $newImgName;

                // continue the loop
                continue;
            }

            // create breadcrumb image using default language image & save unique name in database
            if ($key == 'breadcrumb') {
                // take default lang image
                $dimg = public_path('assets/front/img/' . $dbs->breadcrumb);

                // copy paste the default language image with different unique name
                $filename = uniqid();
                if (($pos = strpos($dbs->breadcrumb, '.')) !== false) {
                    $ext = substr($dbs->breadcrumb, $pos + 1);
                }
                $newImgName = $filename . '.' . $ext;

                @copy($dimg, public_path('assets/front/img/' . $newImgName));

                // save the unique name in database
                $bs[$key] = $newImgName;

                // continue the loop
                continue;
            }

            // create footer_logo image using default language image & save unique name in database
            if ($key == 'footer_logo') {
                // take default lang image
                $dimg = public_path('assets/front/img/' . $dbs->footer_logo);

                // copy paste the default language image with different unique name
                $filename = uniqid();
                if (($pos = strpos($dbs->footer_logo, '.')) !== false) {
                    $ext = substr($dbs->footer_logo, $pos + 1);
                }
                $newImgName = $filename . '.' . $ext;

                @copy($dimg, public_path('assets/front/img/' . $newImgName));

                // save the unique name in database
                $bs[$key] = $newImgName;

                // continue the loop
                continue;
            }

            // create intro_main_image image using default language image & save unique name in database
            if ($key == 'intro_main_image') {
                // take default lang image
                $dimg = public_path('assets/front/img/' . $dbs->intro_main_image);

                // copy paste the default language image with different unique name
                $filename = uniqid();
                if (($pos = strpos($dbs->intro_main_image, '.')) !== false) {
                    $ext = substr($dbs->intro_main_image, $pos + 1);
                }
                $newImgName = $filename . '.' . $ext;

                @copy($dimg, public_path('assets/front/img/' . $newImgName));

                // save the unique name in database
                $bs[$key] = $newImgName;

                // continue the loop
                continue;
            }

            $bs[$key] = $value;
        }
        $bs['language_id'] = $lang->id;
        $bs->save();

        // duplicate First row of basic_extendeds for current language
        $dbe = Language::where('is_default', 1)->first()->basic_extended;
        $be = BE::firstOrFail();
        $cols = json_decode($be, true);
        $be = new BE();
        foreach ($cols as $key => $value) {
            // if the column is 'id' [primary key] then skip it
            if ($key == 'id') {
                continue;
            }

            // create hero image using default language image & save unique name in database
            if ($key == 'hero_img') {
                // take default lang image
                $dimg = public_path('assets/front/img/' . $dbe->hero_img);

                // copy paste the default language image with different unique name
                $filename = uniqid();
                if (($pos = strpos($dbe->hero_img, '.')) !== false) {
                    $ext = substr($dbe->hero_img, $pos + 1);
                }
                $newImgName = $filename . '.' . $ext;

                @copy($dimg, public_path('assets/front/img/' . $newImgName));

                // save the unique name in database
                $be[$key] = $newImgName;

                // continue the loop
                continue;
            }

            $be[$key] = $value;
        }
        $be['language_id'] = $lang->id;
        $be->save();

        Session::flash('success', __('Language added successfully!'));
        return 'success';
    }

    public function edit($id)
    {
        if ($id > 0) {
            $data['language'] = Language::findOrFail($id);
        }
        $data['id'] = $id;

        return view('admin.language.edit', $data);
    }
    
    // public function addKeyword(Request $request)
    // {
    //     $request->validate([
    //         'keyword' => 'required',
    //     ]);

    //     $language = Language::find($id);
    //     $json = file_get_contents(resource_path('lang/') . $language->code . '.json');
    //     $json = json_decode($json, true);

    //     $json[$request->keyword] = $request->keyword;
    //     $jsonData = json_encode($json);

    //     file_put_contents(resource_path('lang/') . $language->code . '.json', $jsonData);

    //     Session::flash('success', __('A new keyword add successfully for language'). ' ' . $language->name);
    //     // return response()->json(['status' => 'success'], 200);
    //     return 'success';
    // }


    public function addFrontKeyword(Request $request)
    {
        
        $rules = [
            'front_keyword' => 'required|max:255',
        ];
        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }
        //    for  admin default file
        $jsonData = file_get_contents(resource_path('lang/') . 'default.json');

        $keywords = json_decode($jsonData, true);
        $datas = [];
        $datas[$request->front_keyword] = $request->front_keyword;
        foreach ($keywords as $key => $keyword) {
            $datas[$key] = $keyword;
        }
        //put data
        $jsonData = json_encode($datas);
        $fileLocated = resource_path('lang/') . 'default.json';
        // put all the keywords in the selected language file
        file_put_contents($fileLocated, $jsonData);

        //    for  admin {languages} file
        $languages = Language::all();
        foreach ($languages as $langkey => $language) {
            $jsonData = file_get_contents(resource_path('lang/') . $language->code . '.json');
            $keywords = json_decode($jsonData, true);
            $datas = [];
            $datas[$request->front_keyword] = $request->front_keyword;
            foreach ($keywords as $key => $keyword) {
                $datas[$key] = $keyword;
            }
            //put data
            $jsonData = json_encode($datas);
            $fileLocated = resource_path('lang/') . $language->code . '.json';
            // put all the keywords in the selected language file
            file_put_contents($fileLocated, $jsonData);
        }
        // get all the keywords of the selected language
        // convert json encoded string into a php associative array
        Session::flash('success', __('New Frontend Keyword Added successfully'));
        return 'success';
        // return back()->with('success', __('New Frontend Keyword Added successfully'));
    }

    public function update(Request $request)
    {
        $language = Language::findOrFail($request->language_id);

        $rules = [
            'name' => 'required|max:255',
            'code' => ['required', 'max:255', Rule::unique('languages')->ignore($language->id)],
            'direction' => 'required',
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }

        $language->name = $request->name;
        $language->code = $request->code;
        $language->rtl = $request->direction;
        $language->save();

        Session::flash('success', __('Language updated successfully!'));
        return 'success';
    }

    public function editKeyword($id)
    {
        
        $isAdmin = 0;
        if ($id > 0) {
            $la = Language::findOrFail($id);
            $json = file_get_contents(resource_path('lang/') . $la->code . '.json');
            $json = json_decode($json, true);
            $list_lang = Language::all();
            if (empty($json)) {
                return back()->with('alert', __('File Not Found'));
            }
            return view('admin.language.edit-keyword', compact('json', 'la', 'isAdmin'));
        } elseif ($id == 0) {
            $json = file_get_contents(resource_path('lang/') . 'default.json');
            $json = json_decode($json, true);
            if (empty($json)) {
                return back()->with('alert', __('File Not Found'));
            }
            return view('admin.language.edit-keyword', compact('json', 'isAdmin'));
        }
    }

    public function updateKeyword(Request $request, $id)
    {
        

        $lang = Language::findOrFail($id);
        $content = json_encode($request->keys);
        
        if ($content === 'null') {
            return back()->with('alert', __('At Least One Field Should Be Fill-up'));
        }
        if ($request->isAdmin == 1) {
            $validationFilePath = resource_path('lang/admin_' . $lang->code . '/validation.php');
            $this->updateNameAttributeforAdmin($validationFilePath, $content);
            file_put_contents(resource_path('lang/') . 'admin_' . $lang->code . '.json', $content);
        } else {
            $validationFilePath = resource_path('lang/' . $lang->code . '/validation.php');
            
            $this->updateNameAttributeforAdminFrontend($validationFilePath, $content);
            file_put_contents(resource_path('lang/') . $lang->code . '.json', $content);
        }

        Session::flash('success', __('Updated successfully!'));
        return 'success';
    }

    public function delete($id)
    {
        $la = Language::findOrFail($id);
        if ($la->is_default == 1) {
            return back()->with('warning', 'Default language cannot be deleted!');
        }
        @unlink(resource_path('lang/') . $la->code . '.json');
        if (session()->get('lang') == $la->code) {
            session()->forget('lang');
        }

        //admin language
        if (session()->get('admin_lang') == $la->code) {
            session()->forget('admin_lang');
        }
        @unlink(resource_path('lang/admin_') . $la->code . '.json');
        $adminPath = resource_path('lang/admin_' . $la->code);
        $this->deleteFolder($adminPath);
        //user language
        if (session()->get('user_lang') == $la->code) {
            session()->forget('user_lang');
        }
        @unlink(resource_path('lang/user_') . $la->code . '.json');
        $userPath = resource_path('lang/user_' . $la->code);
        $this->deleteFolder($userPath);


        // deleting basic_settings and basic_extended for corresponding language & unlink images
        $bs = $la->basic_setting;
        if (!empty($bs)) {
            @unlink(public_path('assets/front/img/' . $bs->favicon));

            @unlink(public_path('assets/front/img/' . $bs->logo));

            @unlink(public_path('assets/front/img/' . $bs->preloader));

            @unlink(public_path('assets/front/img/' . $bs->breadcrumb));

            @unlink(public_path('assets/front/img/' . $bs->intro_main_image));

            @unlink(public_path('assets/front/img/' . $bs->footer_logo));

            @unlink(public_path('assets/front/img/' . $bs->maintenance_img));

            $bs->delete();
        }
        $be = $la->basic_extended;
        if (!empty($be)) {
            $be->delete();
        }

        // deleting services for corresponding language
        if (!empty($la->blogs)) {
            $blogs = $la->blogs;
            foreach ($blogs as $blog) {
                @unlink(public_path('assets/front/img/blogs/' . $blog->main_image));
                $blog->delete();
            }
        }

        // deleting blog categories for corresponding language
        if (!empty($la->bcategories)) {
            $bcategories = $la->bcategories;
            foreach ($bcategories as $bcat) {
                $bcat->delete();
            }
        }

        // deleting faqs for corresponding language
        if (!empty($la->faqs)) {
            $la->faqs()->delete();
        }

        // deleting feature for corresponding language
        if (!empty($la->features)) {
            $features = $la->features;
            foreach ($features as $feature) {
                $feature->delete();
            }
        }

        // deleting menus for corresponding language
        if (!empty($la->menus)) {
            $la->menus()->delete();
        }

        // deleting pages for corresponding language
        if (!empty($la->pages)) {
            $la->pages()->delete();
        }

        // deleting partners for corresponding language
        if (!empty($la->partners)) {
            $partners = $la->partners;
            foreach ($partners as $partner) {
                @unlink(public_path('assets/front/img/partners/' . $partner->image));
                $partner->delete();
            }
        }

        // deleting partners for corresponding language
        if (!empty($la->popups)) {
            $popups = $la->popups;
            foreach ($popups as $popup) {
                @unlink(public_path('assets/front/img/popups/' . $popup->background_image));
                @unlink(public_path('assets/front/img/popups/' . $popup->image));
                $popup->delete();
            }
        }

        // deleting processes for corresponding language
        if (!empty($la->processes)) {
            $processes = $la->processes;
            foreach ($processes as $process) {
                @unlink(public_path('assets/front/img/process/' . $process->image));
                $process->delete();
            }
        }

        // deleting seo for corresponding language
        if (!empty($la->seo)) {
            $la->seo->delete();
        }

        // deleting testimonials for corresponding language
        if (!empty($la->testimonials)) {
            $testimonials = $la->testimonials;
            foreach ($testimonials as $testimonial) {
                @unlink(public_path('assets/front/img/testimonials/' . $testimonial->image));
                $testimonial->delete();
            }
        }

        // deleting useful links for corresponding language
        if (!empty($la->ulinks)) {
            $la->ulinks()->delete();
        }

        // if the the deletable language is the currently selected language in frontend then forget the selected language from session
        session()->forget('lang');

        $la->delete();
        return back()->with('success', __('Delete Successfully'));
    }


    public function default(Request $request, $id)
    {
        Language::where('is_default', 1)->update(['is_default' => 0]);
        $lang = Language::find($id);
        $lang->is_default = 1;
        $lang->save();

        // Update the session with the new default language code
        session(['admin_lang' => 'admin_' .$lang->code]);
        
        app()->setLocale('admin_' . $lang->code);

        // Redirect to the languages page with the new language code in the URL
        return redirect()->route('admin.language.index', ['language' => $lang->code])
            ->with('success', $lang->name . ' ' . __('language is set as default'));
    }


    public function rtlcheck($langid)
    {
        if ($langid > 0) {
            $lang = Language::find($langid);
        } else {
            return 0;
        }

        return $lang->rtl;
    }


    public function addKeyword(Request $request)
    {
        $rules = [
            'keyword' => 'required',
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return response()->json([
                'errors' => $validator->getMessageBag()->toArray(),
            ], 400);
        }
        $languages = Language::get();
        foreach ($languages as $language) {
            // get all the keywords of the selected language
            $jsonData = file_get_contents(resource_path('lang/') . 'admin_' . $language->code . '.json');

            // convert json encoded string into a php associative array
            $keywords = json_decode($jsonData, true);
            $datas = [];
            $datas[$request->keyword] = $request->keyword;

            foreach ($keywords as $key => $keyword) {
                $datas[$key] = $keyword;
            }
            //put data
            $jsonData = json_encode($datas);

            $fileLocated = resource_path('lang/') . 'admin_' . $language->code . '.json';

            // put all the keywords in the selected language file
            file_put_contents($fileLocated, $jsonData);
        }

        //for default json
        // get all the keywords of the selected language
        $jsonData = file_get_contents(resource_path('lang/') . 'admin_default.json');

        // convert json encoded string into a php associative array
        $keywords = json_decode($jsonData, true);
        $datas = [];
        $datas[$request->keyword] = $request->keyword;

        foreach ($keywords as $key => $keyword) {
            $datas[$key] = $keyword;
        }
        //put data
        $jsonData = json_encode($datas);

        $fileLocated = resource_path('lang/') . 'admin_default.json';

        // put all the keywords in the selected language file
        file_put_contents($fileLocated, $jsonData);

        Session::flash('success', __('Added Successfully'));
        return 'success';
    }

    public function editAdminKeyword(Request $request, $id)
    {

        $isAdmin = 1;
        if ($id > 0) {
            $la = Language::findOrFail($id);
            $json = file_get_contents(resource_path('lang/') . 'admin_' . $la->code . '.json');
            $json = json_decode($json, true);
            $list_lang = Language::all();
            if (empty($json)) {
                return back()->with('alert', 'File Not Found.');
            }

            return view('admin.language.edit-keyword', compact('json', 'la', 'isAdmin'));
        } elseif ($id == 0) {
            $json = file_get_contents(resource_path('lang/') . 'admin_' . 'default.json');
            $json = json_decode($json, true);
            if (empty($json)) {
                return back()->with('alert', 'File Not Found.');
            }
            return view('admin.language.edit-keyword', compact('json', 'isAdmin'));
        }
    }

    public function addKeywordForUserDashboard(Request $request)
    {
        $rules = [
            'user_keyword' => 'required',
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return response()->json([
                'errors' => $validator->getMessageBag()->toArray(),
            ], 400);
        }
        
        $languages = Language::get();
        foreach ($languages as $language) {
            // get all the keywords of the selected language
            $jsonData = file_get_contents(resource_path('lang/') . 'user_' . $language->code . '.json');

            // convert json encoded string into a php associative array
            $keywords = json_decode($jsonData, true);
            $datas = [];
            $datas[$request->user_keyword] = $request->user_keyword;

            foreach ($keywords as $key => $keyword) {
                $datas[$key] = $keyword;
            }
            //put data
            $jsonData = json_encode($datas);

            $fileLocated = resource_path('lang/') . 'user_' . $language->code . '.json';

            // put all the keywords in the selected language file
            file_put_contents($fileLocated, $jsonData);
        }

        //for default json
        // get all the keywords of the selected language
        $jsonData = file_get_contents(resource_path('lang/') . 'user_default.json');

        // convert json encoded string into a php associative array
        $keywords = json_decode($jsonData, true);
        $datas = [];
        $datas[$request->user_keyword] = $request->user_keyword;

        foreach ($keywords as $key => $keyword) {
            $datas[$key] = $keyword;
        }
        //put data
        $jsonData = json_encode($datas);

        $fileLocated = resource_path('lang/') . 'user_default.json';

        // put all the keywords in the selected language file
        file_put_contents($fileLocated, $jsonData);

        Session::flash('success', __('Added Successfully'));
        return 'success';
    }

    protected function adminLanguageKeywords($code)
    {
        $admin_data = file_get_contents(resource_path('lang/') . 'admin_default.json');
        $admin_json_file = 'admin_' . $code . '.json';
        $admin_path = resource_path('lang/') . $admin_json_file;
        File::put($admin_path, $admin_data);

        //copy folder
        $adminSourceFolder = resource_path('lang/' . $code);
        $adminNewFolder = resource_path('lang/' . 'admin_' . $code);
        $this->duplicateFolderAndRename($adminSourceFolder, $adminNewFolder);
        $adminValidationSrc = resource_path('lang/admin_' . $code . '/validation.php');
        $this->updateNameAttributeforAdmin($adminValidationSrc, $admin_data);

        // admin frontend validation file
        $admin_frontend_json_data = file_get_contents(resource_path('lang/') . 'default.json');
        $validationFilePath = resource_path('lang/' . $code . '/validation.php');
        $this->updateNameAttributeforAdminFrontend($validationFilePath, $admin_frontend_json_data);
        
    }

    protected function userLanguageKeywords($code)
    {
        $user_data = file_get_contents(resource_path('lang/') . 'user_default.json');
        $admin_json_file = 'user_' . $code . '.json';
        $user_path = resource_path('lang/') . $admin_json_file;
        File::put($user_path, $user_data);
        //copy folder
        $userSourceFolder = resource_path('lang/' . $code);
        $userNewFolder = resource_path('lang/' . 'user_' . $code);
        $this->duplicateFolderAndRename($userSourceFolder, $userNewFolder);
        $userValidationSrc = resource_path('lang/user_' . $code . '/validation.php');
        $this->updateNameAttributeForUser($userValidationSrc, $user_data);
    }

    protected function duplicateAndRenameFolder($source, $destination)
    {
        // Create the destination folder if it doesn't exist
        if (!is_dir($destination)) {
            mkdir($destination, 0755, true);
        }

        // Open the source folder
        $directory = opendir($source);

        // Copy each file and subfolder
        while (($file = readdir($directory)) !== false) {
            if ($file !== '.' && $file !== '..') {
                $sourcePath = $source . DIRECTORY_SEPARATOR . $file;
                $destinationPath = $destination . DIRECTORY_SEPARATOR . $file;

                if (is_dir($sourcePath)) {
                    // Recursively copy subfolders
                    $this->duplicateAndRenameFolder($sourcePath, $destinationPath);
                } else {
                    // Copy files
                    copy($sourcePath, $destinationPath);
                }
            }
        }

        closedir($directory);
    }

    protected function duplicateFolderAndRename($sourceFolder, $newFolder)
    {
        if (is_dir($sourceFolder)) {
            $this->duplicateAndRenameFolder($sourceFolder, $newFolder);
        }

        return true;
    }


    protected function updateNameAttributeForUser($validationFilePath, $requestKeywordsArr)
    {
        if (file_exists($validationFilePath)) {
            $validationData = include $validationFilePath;
            $validationAttributes = $validationData['attributes'];

            if (is_array($validationAttributes)) {
                foreach (Keywords::userNameAttribute() as $key => $value) {
                    if (!array_key_exists($key, $validationAttributes)) {
                        $validationAttributes[$key] = $value;
                    }
                }
            }

            foreach (json_decode($requestKeywordsArr) as $key => $value) {
                if (array_key_exists($key, $validationAttributes)) {
                    $validationAttributes[$key] = $value;
                }
            }

            $validationData['attributes'] = $validationAttributes;
            $validationContent = "<?php\n\nreturn " . var_export($validationData, true) . ";\n";
            file_put_contents($validationFilePath, $validationContent);
        }
    }


    protected function updateNameAttributeforAdmin($validationFilePath, $requestKeywordsArr)
    {
        
        if (file_exists($validationFilePath)) {
            $validationData = include $validationFilePath;
            $validationAttributes = $validationData['attributes'];
            if (is_array($validationAttributes)) {
                foreach (Keywords::adminNameAttribute() as $key => $value) {
                    if (!array_key_exists($key, $validationAttributes)) {
                        $validationAttributes[$key] = $value;
                    }
                }
            }

            foreach (json_decode($requestKeywordsArr) as $key => $value) {
                if (array_key_exists($key, $validationAttributes)) {
                    $validationAttributes[$key] = $value;
                }
            }

            $validationData['attributes'] = $validationAttributes;
            $validationContent = "<?php\n\nreturn " . var_export($validationData, true) . ";\n";
            file_put_contents($validationFilePath, $validationContent);
        }
    }

    protected function updateNameAttributeforAdminFrontend($validationFilePath, $requestKeywordsArr)
    {
        
        if (file_exists($validationFilePath)) {
            $validationData = include $validationFilePath;
            
            $validationAttributes = $validationData['attributes'];
            
            if (is_array($validationAttributes)) {
                foreach (Keywords::adminFrontendValidationAttribute() as $key => $value) {
                    if (!array_key_exists($key, $validationAttributes)) {
                        $validationAttributes[$key] = $value;
                    }
                }
            }

            foreach (json_decode($requestKeywordsArr, true) as $key => $value) {
                if (array_key_exists($key, $validationAttributes)) {
                    $validationAttributes[$key] = $value;
                }
            }

            $validationData['attributes'] = $validationAttributes;
            $validationContent = "<?php\n\nreturn " . var_export($validationData, true) . ";\n";
            file_put_contents($validationFilePath, $validationContent);
        }
    }

    protected function deleteFolder($dirname)
    {
        $dir_handle = null;
        if (is_dir($dirname)) {
            $dir_handle = opendir($dirname);
        }
        if (!$dir_handle) {
            return false;
        }
        while ($file = readdir($dir_handle)) {
            if ($file != '.' && $file != '..') {
                if (!is_dir($dirname . '/' . $file)) {
                    unlink($dirname . '/' . $file);
                } else {
                    $this->deleteFolder($dirname . '/' . $file);
                }
            }
        }
        closedir($dir_handle);
        rmdir($dirname);
        return true;
    }
}
