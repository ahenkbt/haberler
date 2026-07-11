<?php

namespace App\Models\User\DonationManagement;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DonationCategories extends Model
{
    use HasFactory;

    public  $table = 'user_donation_categories';
    protected $guarded = [];

    public function donations(){
        return $this->hasMany(DonationContent::class, 'donation_category_id','id');
    }
}
