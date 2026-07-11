<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserItemCategory extends Model
{
    use HasFactory;


    protected $fillable = ['name', 'image', 'language_id', 'status', 'slug', 'user_id', 'is_feature'];
    protected $table = 'user_item_categories';

    public function items()
    {
        return $this->hasMany(UserItemContent::class, 'category_id', 'id');
    }
    public function subcategories()
    {
        return $this->hasMany(UserItemSubCategory::class, 'category_id', 'id')->where('status', 1);
    }

    public function language()
    {
        return $this->belongsTo(Language::class);
    }
}
