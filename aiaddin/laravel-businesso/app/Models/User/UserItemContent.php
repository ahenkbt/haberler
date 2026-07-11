<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserItemContent extends Model
{
    use HasFactory;
    protected $table = 'user_item_contents';

    protected $guarded = [];

    public function item()
    {
        return $this->belongsTo(UserItem::class, 'item_id', 'id');
    }

    public function category()
    {
        return $this->belongsTo(UserItemCategory::class);
    }
    public function subcategory()
    {
        return $this->belongsTo(UserItemSubCategory::class);
    }
    public function variations()
    {
        return $this->hasMany(UserItemVariation::class, 'item_id');
    }
}
